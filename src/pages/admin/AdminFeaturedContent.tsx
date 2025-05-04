
import React, { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFeaturedContent,
  deleteFeaturedContent,
  getFeaturedContent,
} from "@/services/featuredContentService";
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
import { useAuth } from "@/context/AuthContext";
import { v4 as uuidv4 } from 'uuid';
import { uploadImage } from "@/services/imageUploadService";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const AdminFeaturedContent: React.FC = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [link, setLink] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuth();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["featuredContent"],
    queryFn: getFeaturedContent
  });

  const createProductMutation = useMutation({
    mutationFn: createFeaturedContent,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["featuredContent"]});
      setName("");
      setDescription("");
      setImageUrl("");
      setLink("");
      setImageFile(null);
      toast({
        title: "Success",
        description: "Product added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add product",
        variant: "destructive",
      });
    },
  });

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

  const handleImageUpload = async (file: File) => {
    try {
      if (!session?.user?.id) {
        toast({
          title: "Error",
          description: "User session not found",
          variant: "destructive",
        });
        return;
      }

      const imageName = `${session.user.id}-${uuidv4()}`;
      const uploadedUrl = await uploadImage(file, imageName);

      if (uploadedUrl) {
        setImageUrl(uploadedUrl);
        toast({
          title: "Success",
          description: "Image uploaded successfully!",
        });
      } else {
        toast({
          title: "Error",
          description: "Image upload failed.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Image upload error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !description || !imageUrl || !link) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    createProductMutation.mutate({
      name,
      description,
      image_url: imageUrl,
      link,
    });
  };

  const handleDelete = (id: string) => {
    deleteProductMutation.mutate(id);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      handleImageUpload(file);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-fredoka text-white">Featured Content</h1>
          <p className="text-gray-400 mt-1">Manage featured content on the homepage</p>
        </div>

        {/* Current Products */}
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

        {/* Add New Product */}
        <Card className="lolcow-card">
          <CardHeader>
            <CardTitle>Add New Product</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Product Name"
                />
              </div>
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Product Description"
                />
              </div>
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="image">Image Upload</Label>
                <Input
                  type="file"
                  id="image"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Uploaded"
                    className="w-24 h-24 object-cover rounded mt-2"
                  />
                )}
              </div>
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="link">Link</Label>
                <Input
                  type="url"
                  id="link"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="Product Link"
                />
              </div>
              <Button 
                type="submit" 
                disabled={createProductMutation.isPending}
              >
                {createProductMutation.isPending ? "Adding..." : "Add Product"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminFeaturedContent;
