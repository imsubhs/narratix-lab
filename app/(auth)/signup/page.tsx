import { Suspense } from 'react';
import SignupForm from '@/components/auth/SignupForm';

export const metadata = {
  title: 'Create Account — Narratix Lab',
  description: 'Join Narratix Lab and start building smarter content — free.',
};

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
