
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
import { Trash } from "lucide-react";

interface FeaturedContentTableProps {
  products: FeaturedContent[];
  isLoading: boolean;
}

const FeaturedContentTable: React.FC<FeaturedContentTableProps> = ({ products, isLoading }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteProductMutation = useMutation({
    mutationFn: deleteFeaturedContent,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["featuredContent"]});
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: string) => {
    deleteProductMutation.mutate(id);
  };

  return (
    <Card className="lolcow-card">
      <CardHeader>
        <CardTitle>Current Products</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-gray-300">Loading products...</p>
        ) : products && products.length > 0 ? (
          <Table>
            <TableCaption>A list of your current featured products.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Link</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product: FeaturedContent) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.description}</TableCell>
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
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-gray-300">No products found.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default FeaturedContentTable;
