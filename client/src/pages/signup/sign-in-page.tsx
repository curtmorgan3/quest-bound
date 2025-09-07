import { JoinDiscord, SignUpForm } from '@/libs/compass-api';
import {
  AnimatedSplashCard,
  IconButton,
  SplashCard,
  Stack,
  useDeviceSize,
} from '@/libs/compass-core-ui';
import ArticleIcon from '@mui/icons-material/Article';
import { motion } from 'framer-motion';

export const SignIn = () => {
  const { mobile } = useDeviceSize();

  return (
    <Stack alignItems='center' pt={mobile ? 4 : 0}>
      <Stack alignItems='center' spacing={mobile ? 1 : 2}>
        {mobile ? <SplashCard /> : <AnimatedSplashCard delay={0.5} />}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: mobile ? 0 : 2.5 }}>
          <Stack alignItems='center'>
            <SignUpForm title='Get Started' />
            <Stack
              width='50%'
              sx={{ position: 'absolute', bottom: '10px' }}
              spacing={1}
              alignItems='center'
              justifyContent='center'
              direction='row'>
              <JoinDiscord iconButton />
              <a target='_blank' href='https://docs.questbound.com'>
                <IconButton>
                  <ArticleIcon aria-label='Documentation' />
                </IconButton>
              </a>
            </Stack>
          </Stack>
        </motion.div>
      </Stack>
    </Stack>
  );
};
