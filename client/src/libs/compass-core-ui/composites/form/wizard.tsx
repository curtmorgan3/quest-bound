import React, {
  createContext,
  CSSProperties,
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Button, Stack, Step, StepLabel, Stepper, Text } from '../../components';
import { useDeviceSize } from '../../hooks';
import { Form, FormikForm } from './form';

type WizardContextProps = {
  activeStep: number;
  setNextDisabled: (disabled: boolean) => void;
  setNextLabel: (label: string) => void;
};

const WizardContext = createContext<WizardContextProps>({
  activeStep: 0,
  setNextDisabled: () => {},
  setNextLabel: () => {},
});

interface WizardProps {
  /**
   * Must be WizardStep components
   */
  children: ReactNode;
  steps: string[];
  formik: FormikForm;
  title: string;
  loading?: boolean;
  style?: CSSProperties;
  submitLabel?: string;
  startOnStep?: number;
  hideSteps?: boolean;
}

/**
 * A multi-step form.
 */
export const Wizard = ({
  children,
  title,
  steps,
  formik,
  loading,
  style,
  submitLabel = 'Submit',
  startOnStep = 0,
  hideSteps = false,
}: WizardProps) => {
  const { mobile } = useDeviceSize();
  const [activeStep, setActiveStep] = useState<number>(startOnStep);
  const [nextDisabled, setNextDisabled] = useState<boolean>(false);
  const [nextLabel, setNextLabel] = useState<string>('Next');

  const onNext =
    activeStep === steps.length - 1
      ? formik.handleSubmit
      : () => setActiveStep((s) => Math.min(s + 1, steps.length - 1));

  let index = 0;

  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as ReactElement<ProvidedProps>, {
        index: index++,
      });
    }
    return child;
  });

  const BackButton = () => (
    <Button
      disabled={activeStep === 0}
      onClick={() => setActiveStep((s) => Math.max(s - 1, 0))}
      variant='text'>
      Back
    </Button>
  );

  const NextButton = () => (
    <Button
      variant='contained'
      color='secondary'
      onClick={onNext}
      loading={loading}
      disabled={nextDisabled}>
      {activeStep === steps.length - 1 ? submitLabel : nextLabel}
    </Button>
  );

  const minWidth = mobile ? '250px' : '500px';

  return (
    <WizardContext.Provider
      value={{
        activeStep,
        setNextDisabled,
        setNextLabel,
      }}>
      <Stack
        spacing={3}
        padding={2}
        sx={{ minWidth, minHeight: '250px', overflow: 'hidden', ...style }}>
        {!mobile && <Text variant='h5'>{title}</Text>}
        {mobile && (
          <Stack
            direction='row'
            width='100%'
            justifyContent='space-around'
            alignItems='center'
            pl={1}
            pr={1}>
            <Text>{title}</Text>
            <Stack direction='row' spacing={1}>
              <BackButton />
              <NextButton />
            </Stack>
          </Stack>
        )}

        {!mobile && !hideSteps && (
          <Stepper activeStep={activeStep} sx={{ flexGrow: 1 }}>
            {steps.map((step, i) => (
              <Step key={i} onClick={() => setActiveStep(i)}>
                <StepLabel>{step}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

        {Object.keys(formik.errors).length > 0 && (
          <Text color='error' variant='subtitle2'>
            One or more errors must be corrected
          </Text>
        )}

        <Form
          spacing={2}
          formik={formik}
          style={{
            marginTop: mobile ? 0 : '8px',
            overflowY: 'auto',
            overflowX: 'hidden',
            ...style,
          }}>
          {childrenWithProps}
        </Form>

        {!mobile && (
          <Stack direction='row' width='100%' justifyContent='space-between'>
            <BackButton />
            <NextButton />
          </Stack>
        )}
      </Stack>
    </WizardContext.Provider>
  );
};

interface WizardStepProps {
  children: ReactNode;
  nextDisabled?: boolean;
  skip?: boolean;
  nextLabel?: string;
}

type ProvidedProps = {
  index: number;
};

export const WizardStep = ({
  children,
  nextDisabled,
  nextLabel,
  ...providedProps
}: WizardStepProps) => {
  const { activeStep, setNextDisabled, setNextLabel } = useContext(WizardContext);

  const props = { ...providedProps } as ProvidedProps;

  useEffect(() => {
    if (activeStep === props?.index && nextLabel && nextLabel !== 'Next') {
      setNextLabel(nextLabel);
    } else if (activeStep === props?.index) {
      setNextLabel('Next');
    }
  }, [nextLabel, activeStep]);

  useEffect(() => {
    if (activeStep === props?.index) {
      setNextDisabled(nextDisabled ?? false);
    }
  }, [nextDisabled, activeStep]);

  if (activeStep !== props?.index) {
    return null;
  }

  return <>{children}</>;
};
