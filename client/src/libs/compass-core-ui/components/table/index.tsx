import MUITable, { TableProps as MUITableProps } from '@mui/material/Table';
import MUITableBody, { TableBodyProps as MUITableBodyProps } from '@mui/material/TableBody';
import MUITableCell, { TableCellProps as MUITableCellProps } from '@mui/material/TableCell';
import MUITableContainer, {
  TableContainerProps as MUITableContainerProps,
} from '@mui/material/TableContainer';
import MUITableFooter, { TableFooterProps as MUITableFooterProps } from '@mui/material/TableFooter';
import MUITableHead, { TableHeadProps as MUITableHeadProps } from '@mui/material/TableHead';
import MUITablePagination, {
  TablePaginationProps as MUITablePaginationProps,
} from '@mui/material/TablePagination';
import MUITableRow, { TableRowProps as MUITableRowProps } from '@mui/material/TableRow';

import type { JSX } from "react";

export type TableProps = MUITableProps;
export type TableBodyProps = MUITableBodyProps;
export type TableCellProps = MUITableCellProps;
export type TableContainerProps = MUITableContainerProps;
export type TableHeadProps = MUITableHeadProps;
export type TableRowProps = MUITableRowProps;
export type TablePaginationProps = MUITablePaginationProps;
export type TableFooterProps = MUITableFooterProps;

export const Table = ({ ...baseProps }: TableProps): JSX.Element => <MUITable {...baseProps} />;
export const TableBody = ({ ...baseProps }: TableBodyProps): JSX.Element => (
  <MUITableBody {...baseProps} />
);
export const TableCell = ({ ...baseProps }: TableCellProps): JSX.Element => (
  <MUITableCell {...baseProps} />
);
export const TableContainer = ({ ...baseProps }: TableContainerProps): JSX.Element => (
  <MUITableContainer {...baseProps} />
);
export const TableHead = ({ ...baseProps }: TableHeadProps): JSX.Element => (
  <MUITableHead {...baseProps} />
);
export const TableRow = ({ ...baseProps }: TableRowProps): JSX.Element => (
  <MUITableRow {...baseProps} />
);
export const TablePagination = ({ ...baseProps }: TablePaginationProps): JSX.Element => (
  <MUITablePagination {...baseProps} />
);
export const TableFooter = ({ ...baseProps }: TableFooterProps): JSX.Element => (
  <MUITableFooter {...baseProps} />
);
