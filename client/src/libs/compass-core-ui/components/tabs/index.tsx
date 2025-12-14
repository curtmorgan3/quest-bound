import MUITab, { TabProps as MUITabProps } from '@mui/material/Tab';
import MUITabs, { TabsProps as MUITabsProps } from '@mui/material/Tabs';

import type { JSX } from "react";

export type TabsProps = MUITabsProps;
export type TabProps = MUITabProps;

export const Tabs = ({ ...baseProps }: TabsProps): JSX.Element => <MUITabs {...baseProps} />;

export const Tab = ({ ...baseProps }: TabProps): JSX.Element => <MUITab {...baseProps} />;
