import MUISkeleton, { SkeletonProps as MUISkeletonProps } from '@mui/material/Skeleton';

export type SkeletonProps = MUISkeletonProps;

export const Skeleton = ({ ...baseProps }: SkeletonProps): JSX.Element => (
  <MUISkeleton {...baseProps} />
);
