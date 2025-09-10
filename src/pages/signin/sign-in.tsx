import { AnimatedSplashCard, Link, Stack } from '@/components';
import { motion } from 'framer-motion';
import { SignUpForm } from './sign-up-form';
import { SocialLinks } from './social-links';

export const SignIn = () => {
  return (
    <Stack alignItems='center' gap={1}>
      <AnimatedSplashCard delay={0.5} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.5 }}>
        <Stack alignItems='center' gap={8}>
          <SignUpForm title='Login or Signup' />
          <Stack width='50%' mt={2} gap={1} alignItems='center'>
            <SocialLinks />
            <Link href='https://questbound.com' target='_blank'>
              Learn More
            </Link>
          </Stack>
        </Stack>
      </motion.div>
    </Stack>
  );
};
