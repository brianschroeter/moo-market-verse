import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteFeaturedContent } from "@/services/featuredContentService";
import { FeaturedContent } from "@/services/types/featuredContent-types";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash, Edit } from "lucide-react";

interface FeaturedContentTableProps {
  products: FeaturedContent[];
  isLoading: boolean;
  onEdit: (product: FeaturedContent) => void;
  onDeleteRequest: (product: FeaturedContent) => void;
}

const FeaturedContentTable: React.FC<FeaturedContentTableProps> = ({ products, isLoading, onEdit, onDeleteRequest }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = (product: FeaturedContent) => {
    onDeleteRequest(product);
  };

  return (
    <div className="lolcow-card overflow-hidden">
      {isLoading ? (
        <div className="flex justify-center items-center p-12">
          <p className="text-gray-300">Loading products...</p>
        </div>
      ) : products && products.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow className="border-b border-lolcow-lightgray">
              <TableHead className="w-[100px] text-gray-300">Image</TableHead>
              <TableHead className="text-gray-300">Name</TableHead>
              <TableHead className="text-gray-300">Description</TableHead>
              <TableHead className="text-gray-300">Link</TableHead>
              <TableHead className="text-right text-gray-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product: FeaturedContent) => (
              <TableRow key={product.id} className="border-b border-lolcow-lightgray hover:bg-lolcow-lightgray/10">
                <TableCell className="py-4">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-20 h-20 object-cover rounded"
                  />
                </TableCell>
                <TableCell className="font-medium text-white">
                  <div className="flex items-center space-x-2">
                    {product.featured && (
                      <span 
                        className="inline-block h-2 w-2 rounded-full bg-green-500" 
                        title="Featured"
                      ></span>
                    )}
                    <span>{product.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-gray-300">{product.description}</TableCell>
                <TableCell>
                  <a
                    href={product.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lolcow-blue hover:underline"
                  >
                    {product.link}
                  </a>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-lolcow-blue text-lolcow-blue hover:bg-lolcow-blue hover:text-white"
                      onClick={() => onEdit(product)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(product)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-b border-lolcow-lightgray">
              <TableHead className="w-[100px] text-gray-300">Image</TableHead>
              <TableHead className="text-gray-300">Name</TableHead>
              <TableHead className="text-gray-300">Description</TableHead>
              <TableHead className="text-gray-300">Link</TableHead>
              <TableHead className="text-right text-gray-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                No products found.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default FeaturedContentTable;
