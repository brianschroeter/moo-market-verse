import React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
import { AdminYouTubeChannel } from '@/services/types/youtubeSchedule-types';

interface YouTubeChannelsTableProps {
  channels: AdminYouTubeChannel[];
  onEdit: (channel: AdminYouTubeChannel) => void;
  onDelete: (channel: AdminYouTubeChannel) => void;
  isLoading?: boolean;
}

export const YouTubeChannelsTable: React.FC<YouTubeChannelsTableProps> = ({
  channels,
  onEdit,
  onDelete,
  isLoading,
}) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const columns: ColumnDef<AdminYouTubeChannel>[] = [
    {
      id: 'avatar',
      header: 'Avatar',
      cell: ({ row }) => {
        const channel = row.original;
        if (channel.avatar_url) {
          return (
            <img 
              src={channel.avatar_url} 
              alt={channel.channel_name || 'Avatar'} 
              className="w-10 h-10 rounded-full object-cover bg-lolcow-lightgray/30"
            />
          );
        }
        // Fallback display if no avatar_url (e.g., initials)
        const displayName = channel.channel_name;
        const initials = displayName?.charAt(0).toUpperCase() || '?';
        return (
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-lolcow-blue text-white text-lg font-semibold">
            {initials}
          </div>
        );
      },
      size: 60, // Explicit small size for avatar column
    },
    {
      accessorKey: 'youtube_channel_id',
      header: 'YouTube Channel ID',
    },
    {
      accessorKey: 'channel_name',
      header: 'Official Name',
      cell: ({ row }) => row.original.channel_name || <span className="text-gray-500 italic">N/A</span>,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const channel = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-lolcow-lightgray/[.15]">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(channel)} className="data-[highlighted]:bg-lolcow-lightgray/[.15]">
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(channel)}
                className="text-red-500 hover:text-red-600 data-[highlighted]:bg-lolcow-lightgray/[.15]"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: channels,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  return (
    <div className="rounded-md border bg-lolcow-charcoal border-lolcow-lightgray">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-lolcow-lightgray">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="text-gray-300">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-gray-400">
                Loading channels...
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
                className="border-lolcow-lightgray hover:bg-lolcow-gray/10"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="text-gray-200">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-gray-400">
                No YouTube channels found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-end space-x-2 py-4 px-4 border-t border-lolcow-lightgray">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="border-lolcow-gray text-gray-300 hover:bg-lolcow-gray/20"
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="border-lolcow-gray text-gray-300 hover:bg-lolcow-gray/20"
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default YouTubeChannelsTable; 