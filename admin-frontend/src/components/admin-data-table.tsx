import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Eye, SquarePen, Copy, Trash2, RefreshCw, Plus } from "lucide-react";

export type Column<T = any> = {
  key: string;
  title: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
};

export type AdminDataTableProps<T = any> = {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onSearch?: (q: string) => void;
  onAdd?: () => void;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDuplicate?: (row: T) => void;
  onDelete?: (row: T) => void;
  selectable?: boolean;
  showToolbar?: boolean;
};

export function StatusPill({ status }: { status?: string }) {
  const s = (status || "").toLowerCase();
  const base = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium";
  if (s === "published" || s === "active" || s === "completed") return <span className={`${base} bg-green-100 text-green-800`}>{status}</span>;
  if (s === "draft" || s === "inactive") return <span className={`${base} bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-200`}>{status}</span>;
  if (s === "out of stock" || s === "out") return <span className={`${base} bg-red-100 text-red-800`}>{status}</span>;
  return <span className={`${base} bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-200`}>{status}</span>;
}

export default function AdminDataTable<T = any>(props: AdminDataTableProps<T>) {
  const {
    columns,
    rows,
    loading,
    total,
    page = 1,
    pageSize = 25,
    onPageChange,
    onPageSizeChange,
    onSearch,
    onAdd,
    onView,
    onEdit,
    onDuplicate,
    onDelete,
    selectable = true,
    showToolbar = true,
  } = props;

  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const allSelected = rows.length > 0 && rows.every((r: any) => selected[String(r._id || r.id || JSON.stringify(r))]);

  function toggleAll(v: boolean) {
    if (!v) return setSelected({});
    const map: Record<string, boolean> = {};
    rows.forEach((r: any) => map[String(r._id || r.id || JSON.stringify(r))] = true);
    setSelected(map);
  }

  function toggleRow(row: any) {
    const id = String(row._id || row.id || JSON.stringify(row));
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  return (
    <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      {showToolbar ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Input placeholder="Search..." onChange={(e) => onSearch && onSearch((e.target as HTMLInputElement).value)} />
            <Button variant="ghost" title="Refresh" onClick={() => (onSearch ? onSearch("") : undefined)}><RefreshCw className="h-4 w-4" /></Button>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => onAdd && onAdd()} className="inline-flex items-center"><Plus className="mr-2 h-4 w-4" />Add New</Button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable ? (
                <TableHeadCell>
                  <Checkbox checked={allSelected} onCheckedChange={(v) => toggleAll(Boolean(v))} aria-label="Select all rows" />
                </TableHeadCell>
              ) : null}
              {columns.map((c) => (
                <TableHeadCell key={c.key} style={{ width: c.width }} className={c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''}>{c.title}</TableHeadCell>
              ))}
              <TableHeadCell className="text-right">Actions</TableHeadCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell>Loading…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell>No results</TableCell></TableRow>
            ) : (
              rows.map((r) => {
                const id = String((r as any)._id || (r as any).id || JSON.stringify(r));
                return (
                  <TableRow key={id} className="hover:bg-slate-50/50 transition-colors duration-150">
                    {selectable ? (
                      <TableCell>
                        <Checkbox checked={Boolean(selected[id])} onCheckedChange={() => toggleRow(r)} aria-label={`Select ${id}`} />
                      </TableCell>
                    ) : null}
                    {columns.map((c) => (
                      <TableCell key={c.key} className={c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''}>
                        {c.render ? c.render(r) : ((r as any)[c.key] ?? '')}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <TooltipProvider delayDuration={0}>
                        <div className="inline-flex items-center gap-2 justify-end">
                          {[
                            { label: "View", icon: Eye, onClick: () => onView && onView(r) },
                            { label: "Edit", icon: SquarePen, onClick: () => onEdit && onEdit(r) },
                            { label: "Duplicate", icon: Copy, onClick: () => onDuplicate && onDuplicate(r) },
                            { label: "Delete", icon: Trash2, onClick: () => onDelete && onDelete(r), destructive: true },
                          ].map(({ label, icon: Icon, onClick, destructive }) => (
                            <Tooltip key={label}>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={onClick}
                                  className={destructive ? "text-destructive hover:bg-destructive/10" : undefined}
                                  aria-label={label}
                                >
                                  <Icon className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">{label}</TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <div>Showing {Math.min(((page-1)*pageSize)+1, total||0)}–{Math.min(page*pageSize, total||rows.length)} of {total ?? rows.length} results</div>
        <div className="flex items-center gap-2">
          <select value={String(pageSize)} onChange={(e) => onPageSizeChange && onPageSizeChange(Number(e.target.value))} className="rounded border px-2 py-1 bg-transparent">
            {[10,25,50,100].map((s) => <option key={s} value={s}>{s}/page</option>)}
          </select>
          <div className="inline-flex items-center gap-1">
            <Button variant="ghost" onClick={() => onPageChange && onPageChange(Math.max(1, page-1))}>Prev</Button>
            <Button variant="ghost" onClick={() => onPageChange && onPageChange(page+1)}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// helper TableHeadCell to avoid importing internal TableHead from ui/table
function TableHeadCell({ children, className, style }:{children?:any,className?:string,style?:any}){
  return (<th style={style} className={`px-3 py-2 text-left text-xs font-medium text-muted-foreground ${className||""}`}>{children}</th>);
}
