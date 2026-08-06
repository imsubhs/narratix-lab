import { NextRequest, NextResponse } from 'next/server';
import { analyzeTextContent, AnalysisResult, AiUnavailableError } from '@/lib/ai-engine';
import { computeBasicDiagnostics, formatBasicDiagnostics } from '@/lib/ai/basic-diagnostics';
import { logAiEvent } from '@/lib/ai/telemetry';
import { FEATURES } from '@/lib/features';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import {
  assertAllowedRequestHost,
  detectSuspiciousClient,
  enforceSupabaseRateLimit,
  getClientIp,
  getAllowedRequestOrigin,
  sanitizeTextForAi,
  toPublicErrorMessage,
  UserFacingError,
  type Plan,
} from '@/lib/security';
import {
  readFileBuffer,
  sanitizeExtractedText,
  validateDocumentUpload,
} from '@/lib/file-security';

export const dynamic = 'force-dynamic';

type UsageResult = {
  allowed: boolean;
  usage_count: number;
  message: string;
};

type AnalysisInsertPayload = {
  user_id: string;
  video_url: string | null;
  video_name: string;
  niche: string;
  platform: string;
  video_length: number | null;
  goal: string;
  concern: string;
  overall_score: number;
  overall_verdict: string;
  results: AnalysisResult & { meta?: any };
  transcript: string;
  input_type?: string;
  file_name?: string | null;
  file_size?: number | null;
  file_type?: string | null;
};

async function consumeUsageWithFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  email?: string | null
): Promise<UsageResult> {
  const { data: usageResult, error: usageError } = await supabase.rpc(
    'consume_beta_analysis_usage'
  );

  if (!usageError) {
    return usageResult as UsageResult;
  }

  console.warn(`[api/analyze] usage RPC failed (code ${usageError.code}): ${usageError.message}. Falling back to service-role...`);
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, plan, usage_count, usage_reset_at')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Usage fallback profile lookup failed: ${profileError.message}`);
  }

  const now = new Date();
  const resetAt = profile?.usage_reset_at ? new Date(profile.usage_reset_at) : now;
  const shouldReset = resetAt.getTime() <= now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const currentUsage = shouldReset ? 0 : Number(profile?.usage_count ?? 0);
  const plan = profile?.plan === 'pro' ? 'pro' : (profile?.plan === 'team' ? 'team' : 'free');

  if (plan === 'free' && currentUsage >= 3) {
    return {
      allowed: false,
      usage_count: currentUsage,
      message: 'Free beta limit reached. Upgrade to Pro for unlimited analyses.',
    };
  }

  const nextUsage = currentUsage + 1;
  const { error: upsertError } = await admin
    .from('profiles')
    .upsert({
      id: userId,
      email: email ?? null,
      plan,
      usage_count: nextUsage,
      usage_reset_at: shouldReset || !profile?.usage_reset_at ? now.toISOString() : profile.usage_reset_at,
      updated_at: now.toISOString(),
    }, { onConflict: 'id' });

  if (upsertError) {
    throw new Error(`Usage fallback update failed: ${upsertError.message}`);
  }

  return {
    allowed: true,
    usage_count: nextUsage,
    message: 'Usage consumed by service-role fallback.',
  };
}

/**
 * Best-effort refund of one analysis credit when the AI layer could not
 * produce a report. The user got diagnostics, not the product — they should
 * not pay a credit for it.
 */
async function refundUsageCredit(userId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('usage_count')
      .eq('id', userId)
      .maybeSingle();
    const current = Number(profile?.usage_count ?? 0);
    if (current > 0) {
      await admin
        .from('profiles')
        .update({ usage_count: current - 1, updated_at: new Date().toISOString() })
        .eq('id', userId);
    }
    logAiEvent({ event: 'ai_usage_refund', outcome: 'refunded' });
  } catch (err) {
    console.warn('[api/analyze] usage refund failed:', err instanceof Error ? err.message : err);
    logAiEvent({ event: 'ai_usage_refund', outcome: 'refund_failed' });
  }
}

async function getUserPlan(userId: string): Promise<Plan> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[api/analyze] plan lookup failed; using free limits:', error.message);
    return 'free';
  }

  return data?.plan === 'pro' || data?.plan === 'team' ? data.plan : 'free';
}

async function saveAnalysisWithSchemaFallback(
  payload: AnalysisInsertPayload
) {
  const admin = createAdminClient();

  // 1. Try to insert with all fields (including Phase 15 document columns)
  const { data: inserted, error: insertError } = await admin
    .from('analyses')
    .insert(payload)
    .select('id')
    .single();

  if (!insertError) {
    return inserted;
  }

  // 2. If it fails because new columns do not exist in schema, try clean payload fallback
  if (
    insertError.message.toLowerCase().includes('column') &&
    (insertError.message.toLowerCase().includes('does not exist') || insertError.message.toLowerCase().includes('schema cache'))
  ) {
    console.warn(
      '[api/analyze] DB schema does not have Phase 15 columns yet. Falling back to clean payload...'
    );
    const { input_type, file_name, file_size, file_type, ...cleanPayload } = payload;
    const { data: insertedClean, error: insertCleanError } = await admin
      .from('analyses')
      .insert(cleanPayload)
      .select('id')
      .single();

    if (!insertCleanError) {
      return insertedClean;
    }
  }

  console.warn(
    '[api/analyze] primary analysis save failed; trying minimal legacy fallback:',
    insertError.message
  );

  // 3. Fallback: Try minimal legacy insertion
  const { data: legacyInserted, error: legacyError } = await admin
    .from('analyses')
    .insert({
      user_id: payload.user_id,
      video_url: payload.video_url,
    })
    .select('id')
    .single();

  if (legacyError) {
    throw new Error(`Database save failed: ${legacyError.message}`);
  }

  return legacyInserted;
}

export async function POST(request: NextRequest) {
  try {
    console.log('[api/analyze] request received');
    assertAllowedRequestHost(request);
    getAllowedRequestOrigin(request);

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('[api/analyze] unauthorized request');
      return NextResponse.json(
        { error: 'Please sign in first.' },
        { status: 401 }
      );
    }

    const botReason = detectSuspiciousClient(request);
    if (botReason) {
      return NextResponse.json(
        { error: botReason },
        { status: 403 }
      );
    }

    const plan = await getUserPlan(user.id);
    const userRate = await enforceSupabaseRateLimit({
      identityKey: `user:${user.id}`,
      action: 'analyze',
      plan,
    });

    if (!userRate.allowed) {
      const rate = userRate as any;
      return NextResponse.json(
        {
          error: rate.message || 'Rate limit exceeded.',
          retry_after_seconds: rate.retry_after_seconds,
        },
        {
          status: 429,
          headers: rate.retry_after_seconds
            ? { 'Retry-After': String(rate.retry_after_seconds) }
            : undefined,
        }
      );
    }

    const clientIp = getClientIp(request);
    if (clientIp !== 'unknown') {
      const ipRate = await enforceSupabaseRateLimit({
        identityKey: `ip:${clientIp}`,
        action: 'analyze-ip',
        plan,
      });

      if (!ipRate.allowed) {
        const rate = ipRate as any;
        return NextResponse.json(
          {
            error: rate.message || 'Rate limit exceeded.',
            retry_after_seconds: rate.retry_after_seconds,
          },
          {
            status: 429,
            headers: rate.retry_after_seconds
              ? { 'Retry-After': String(rate.retry_after_seconds) }
              : undefined,
          }
        );
      }
    }

    const formData = await request.formData();
    const file = formData.get('video');
    const videoUrlFromForm = formData.get('videoUrl');
    // Every field below is interpolated into the AI prompt (lib/ai/prompts.ts
    // buildUserPrompt) and persisted, so each needs a hard length ceiling —
    // `script` alone was capped, leaving these as an unbounded path into the
    // prompt and the database. Caps sit far above the longest real value
    // (niche 20, platform 15, goal 24 chars) so no legitimate submission is
    // affected; sanitizeTextForAi truncates rather than rejects and also
    // strips control characters, which keeps newline/delimiter games out of
    // the context block. videoLength and concern are free-text inputs, so
    // they are bounded by length only — never by an enum.
    const niche = sanitizeTextForAi(String(formData.get('niche') || ''), 120);
    const platform = sanitizeTextForAi(String(formData.get('platform') || ''), 120);
    const goal = sanitizeTextForAi(String(formData.get('goal') || ''), 200);
    const concern = sanitizeTextForAi(String(formData.get('concern') || ''), 1000);
    const videoLength = sanitizeTextForAi(String(formData.get('videoLength') || ''), 40);

    // Document workflow inputs
    const documentFile = formData.get('document') as File | null;
    let script = sanitizeTextForAi(String(formData.get('script') || '').trim());
    
    let inputType = 'text';
    let fileName: string | null = null;
    let fileSize: number | null = null;
    let fileType: string | null = null;

    if (!niche || !platform) {
      return NextResponse.json(
        { error: 'Niche and platform are required.' },
        { status: 400 }
      );
    }

    // Handle Document Upload validation and text extraction
    if (documentFile && documentFile.name) {
      inputType = 'file';

      let buffer: Buffer;
      try {
        buffer = await readFileBuffer(documentFile);
      } catch {
        return NextResponse.json(
          { error: 'Failed to read the uploaded file data.' },
          { status: 400 }
        );
      }

      let uploadInfo: ReturnType<typeof validateDocumentUpload>;
      try {
        uploadInfo = validateDocumentUpload(documentFile, buffer);
        fileName = uploadInfo.safeName;
        fileSize = uploadInfo.size;
        fileType = uploadInfo.mime;
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Invalid upload.' },
          { status: 400 }
        );
      }

      const ext = uploadInfo.extension;

      // 3. Extract Text Content
      let extractedText = '';
      if (ext === '.pdf') {
        try {
          // pdf-parse 2.x: PDFParse.getText() is async and returns TextResult { text, pages, total }
          const parser = new PDFParse({ data: buffer });
          const pdfData = await parser.getText();
          extractedText = pdfData.text || '';
        } catch (err) {
          console.error('PDF extraction error:', err);
          return NextResponse.json(
            { error: 'Failed to extract text from the PDF file. The file may be corrupted.' },
            { status: 400 }
          );
        }
      } else if (ext === '.docx') {
        try {
          const docxData = await mammoth.extractRawText({ buffer });
          extractedText = docxData.value || '';
        } catch (err) {
          console.error('DOCX extraction error:', err);
          return NextResponse.json(
            { error: 'Failed to extract text from the DOCX file. The file may be corrupted.' },
            { status: 400 }
          );
        }
      } else if (ext === '.txt' || ext === '.md') {
        try {
          extractedText = buffer.toString('utf-8');
        } catch (err) {
          console.error(`${ext.toUpperCase().substring(1)} extraction error:`, err);
          return NextResponse.json(
            { error: `Failed to read text from the ${ext.toUpperCase().substring(1)} file.` },
            { status: 400 }
          );
        }
      }

      script = sanitizeExtractedText(extractedText);
      if (!script) {
        return NextResponse.json(
          { error: 'The document contains no readable text.' },
          { status: 400 }
        );
      }
    }

    // Fallback check if script is empty and video upload features are blocked
    if (!FEATURES.VIDEO_UPLOAD && (file || (typeof videoUrlFromForm === 'string' && videoUrlFromForm.trim()))) {
      return NextResponse.json(
        { error: 'Video upload is coming soon. Use the text or document upload forms.' },
        { status: 400 }
      );
    }

    if (!script) {
      return NextResponse.json(
        { error: 'Please enter a script or upload a supported document.' },
        { status: 400 }
      );
    }

    console.log('[api/analyze] payload validated', {
      userId: user.id,
      niche,
      platform,
      hasScript: Boolean(script),
      inputType,
      fileName,
    });

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const sendEvent = async (
      stage: string,
      status: string,
      message: string,
      payload?: { results?: AnalysisResult; transcript?: string; analysisId?: string }
    ) => {
      const data = JSON.stringify({
        stage,
        status,
        message,
        ...payload,
      });
      await writer.write(encoder.encode(`data: ${data}\n\n`));
    };

    (async () => {
      let usageConsumed = false;
      try {
        console.log('[api/analyze] checking usage');
        await sendEvent('checking_usage', 'running', 'Checking monthly beta usage...');

        const usage = await consumeUsageWithFallback(supabase, user.id, user.email);

        if (!usage.allowed) {
          console.log('[api/analyze] usage denied', usage);
          // Quota messages are written for the user, so they stay verbatim.
          throw new UserFacingError(
            usage.message || 'Free beta limit reached. Upgrade to Pro for unlimited analyses.'
          );
        }
        usageConsumed = true;

        await sendEvent('checking_usage', 'done', 'Usage check complete.');
        await sendEvent('analyzing', 'running', 'Running Creator Intelligence diagnostics...');

        console.log('[api/analyze] running AI analysis');
        const { results, transcript, meta } = await analyzeTextContent({
          script,
          niche,
          platform,
          videoLength,
          goal,
          concern,
        });

        await sendEvent('analyzing', 'done', 'Creator Intelligence analysis complete.');

        // Parse videoLength string selection to integer seconds or null (matching DB schema constraint)
        let parsedVideoLength: number | null = null;
        if (videoLength === '0-15s') parsedVideoLength = 15;
        else if (videoLength === '15-30s') parsedVideoLength = 30;
        else if (videoLength === '30-60s') parsedVideoLength = 60;
        else if (videoLength === '60-90s') parsedVideoLength = 90;
        else if (videoLength === '90s+') parsedVideoLength = 120;
        else {
          const num = parseInt(videoLength, 10);
          if (!isNaN(num)) {
            parsedVideoLength = num;
          }
        }

        // Attach upload + generation metadata inside the results JSONB object.
        // generation_source makes every stored report auditable: it can only
        // ever be a real provider name — fallback output is never stored.
        const resultsWithMeta = {
          ...results,
          meta: {
            input_type: inputType,
            file_name: fileName,
            file_size: fileSize,
            file_type: fileType,
            upload_date: new Date().toISOString(),
            generation_source: meta.generationSource,
            provider: meta.provider,
            model: meta.model,
            prompt_version: meta.promptVersion,
            analysis_version: meta.analysisVersion,
            request_id: meta.requestId,
            latency_ms: meta.latencyMs,
            prompt_tokens: meta.promptTokens,
            completion_tokens: meta.completionTokens,
            estimated_cost_usd: meta.estimatedCostUsd,
            fallback_triggered: false,
          }
        };

        const inserted = await saveAnalysisWithSchemaFallback({
          user_id: user.id,
          video_url: null,
          video_name: fileName || 'Text beta analysis',
          niche,
          platform,
          video_length: parsedVideoLength,
          goal,
          concern,
          overall_score: results.overall_score,
          overall_verdict: results.overall_verdict,
          results: resultsWithMeta,
          transcript,
          input_type: inputType,
          file_name: fileName,
          file_size: fileSize,
          file_type: fileType,
        });
        console.log('[api/analyze] analysis stored', { analysisId: inserted?.id });

        await sendEvent('complete', 'done', 'Report generated!', {
          results: resultsWithMeta,
          transcript,
          analysisId: inserted?.id,
        });
      } catch (error) {
        console.error('Analysis error:', error);
        if (error instanceof AiUnavailableError) {
          // Honest degradation: no report is fabricated, the credit is
          // refunded, and the user gets measured facts only.
          if (usageConsumed) await refundUsageCredit(user.id);
          const diagnostics = computeBasicDiagnostics(script);
          const message =
            'AI reasoning is currently unavailable, so we could not generate your Creator Intelligence report. ' +
            'Your analysis credit has not been used. ' +
            `Basic Creator Diagnostics (measured directly from your script, not AI): ${formatBasicDiagnostics(diagnostics)}. ` +
            'Please try again in a few minutes — if this keeps happening, contact support.';
          await sendEvent('error', 'error', message);
        } else {
          // Internal failures (database, schema, provider plumbing) are logged
          // above but never described to the client.
          const message = toPublicErrorMessage(
            error,
            'Analysis failed unexpectedly. Please try again — if this keeps happening, contact support.'
          );
          await sendEvent('error', 'error', message);
        }
      } finally {
        console.log('[api/analyze] stream closing');
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Connection: 'keep-alive',
      },
    });
  } catch (globalError) {
    console.error('[api/analyze] Uncaught global handler error:', globalError);
    return NextResponse.json(
      { error: toPublicErrorMessage(globalError, 'Internal Server Error') },
      { status: 500 }
    );
  }
}
