import { useLottie } from 'lottie-react';
import LoadingAnimation from './loading.json';

export const AnimatedLogo = () => {
  const style = { height: 500, width: 500 };

  const { View } = useLottie({
    animationData: LoadingAnimation,
    loop: true,
    autoPlay: true,
    style,
  });

  return View;
};
