import React from 'react';

// ============================================================================
// UI-01 & 01_ui_foundation.md: Semantic Data Table Primitive (PR-TABLE)
// ============================================================================

export const TableContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`bg-surface border border-line rounded-sm overflow-hidden ${className}`.trim()}>
    <div className="overflow-x-auto">{children}</div>
  </div>
);

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <table className={`w-full text-left border-collapse text-xs ${className}`.trim()} {...props}>
    {children}
  </table>
);

export const TableHead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <thead
    className={`bg-elevated border-b border-line text-ink-secondary uppercase font-mono text-2xs select-none ${className}`.trim()}
    {...props}
  >
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <tbody className={`divide-y divide-line ${className}`.trim()} {...props}>
    {children}
  </tbody>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <tr className={`hover:bg-elevated transition-colors group ${className}`.trim()} {...props}>
    {children}
  </tr>
);

export const TableHeaderCell: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <th scope="col" className={`py-2.5 px-4 font-semibold ${className}`.trim()} {...props}>
    {children}
  </th>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <td className={`py-3 px-4 ${className}`.trim()} {...props}>
    {children}
  </td>
);
