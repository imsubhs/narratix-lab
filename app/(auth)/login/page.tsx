import { Suspense } from 'react';
import LoginForm from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Sign In — Narratix Lab',
  description: 'Sign in to your Narratix Lab workspace to analyze your scripts.',
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
