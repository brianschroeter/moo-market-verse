import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFeaturedContent } from "@/services/featuredContentService";
import { v4 as uuidv4 } from 'uuid';
import { uploadImage } from "@/services/imageUploadService";
import { useAuth } from "@/context/AuthContext";
import { FeaturedContent } from "@/services/types/featuredContent-types";
import { CreateFeaturedContentParams } from "@/services/featuredContentService";
import { Loader2, Upload } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface FeaturedContentFormProps {
  initialData?: FeaturedContent & { price?: number };
  onSubmit: (data: CreateFeaturedContentParams) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

const FeaturedContentForm: React.FC<FeaturedContentFormProps> = ({ 
  initialData, 
  onSubmit, 
  isSubmitting, 
  onCancel 
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [link, setLink] = useState("");
  const [featured, setFeatured] = useState(false);
  const [price, setPrice] = useState<number | string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description);
      setImageUrl(initialData.image_url);
      setLink(initialData.link);
      setFeatured(initialData.featured);
      setPrice(initialData.price !== undefined ? initialData.price : "");
      setImageFile(null);
    } else {
      setName("");
      setDescription("");
      setImageUrl("");
      setLink("");
      setFeatured(false);
      setPrice("");
      setImageFile(null);
    }
  }, [initialData]);

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
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
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numericPrice = price === "" ? undefined : parseFloat(String(price));
    if (price !== "" && (isNaN(numericPrice) || numericPrice < 0)) {
        toast({
            title: "Error",
            description: "Please enter a valid positive price.",
            variant: "destructive",
        });
        return;
    }

    if (!name || !description || !imageUrl || !link) {
      toast({
        title: "Error",
        description: "Please fill in Name, Description, Image, and Link fields.",
        variant: "destructive",
      });
      return;
    }

    onSubmit({
      name,
      description,
      image_url: imageUrl,
      link,
      featured,
      price: numericPrice,
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      handleImageUpload(file);
    } else {
      // If user cancels file selection, reset image state
      // This prevents keeping an old image preview if they select, then cancel
      // setImageFile(null); 
      // setImageUrl(""); // Decide if you want this behavior
    }
  };

  // Function to trigger the hidden file input
  const handleButtonClick = () => {
      fileInputRef.current?.click();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="name" className="text-gray-300">Name</Label>
        <Input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Product Name"
          className="bg-lolcow-lightgray/30 text-white border-lolcow-lightgray focus:ring-lolcow-blue"
          required
        />
      </div>
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="description" className="text-gray-300">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Product Description"
          className="bg-lolcow-lightgray/30 text-white border-lolcow-lightgray focus:ring-lolcow-blue"
          required
        />
      </div>
      <div className="w-full space-y-1.5">
        <Label htmlFor="image" className="text-gray-300">Image</Label>
        <div className="flex items-center">
          <Input
            type="file"
            id="image"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            disabled={isUploading}
          />
          <Button 
            type="button"
            variant="outline"
            onClick={handleButtonClick}
            disabled={isUploading}
            className="border-lolcow-blue text-lolcow-blue hover:bg-lolcow-blue/20"
          >
            {isUploading ? (
                 <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
            ) : (
                 <Upload className="mr-2 h-4 w-4" /> 
            )}
            {isUploading ? 'Uploading...' : 'Choose Image'}
          </Button>
        </div>
        <div className="pt-2 space-y-2">
            {imageFile && !isUploading && (
              <div className="text-sm text-gray-400 truncate" title={imageFile.name}>
                 Selected: {imageFile.name}
              </div>
             )} 
             {imageUrl && !imageFile && !isUploading && initialData && (
              <div className="text-sm text-gray-400">(Current image is set)</div> 
             )} 
             {isUploading && (
              <div className="text-sm text-gray-400 flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Uploading...</div>
             )} 
        
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Image preview"
                className="w-24 h-24 object-cover rounded border border-lolcow-lightgray"
              />
            )}
        </div>
      </div>
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="link" className="text-gray-300">Link</Label>
        <Input
          type="url"
          id="link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://example.com"
          className="bg-lolcow-lightgray/30 text-white border-lolcow-lightgray focus:ring-lolcow-blue"
          required
        />
      </div>
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="price" className="text-gray-300">Price (Optional)</Label>
        <Input
          type="number"
          id="price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="e.g., 19.99"
          step="0.01"
          min="0"
          className="bg-lolcow-lightgray/30 text-white border-lolcow-lightgray focus:ring-lolcow-blue"
        />
      </div>
      <div className="flex items-center space-x-2 pt-2">
        <Checkbox 
          id="featured"
          checked={featured}
          onCheckedChange={(checked) => setFeatured(Boolean(checked))}
          className="border-gray-500 data-[state=checked]:bg-lolcow-blue data-[state=checked]:border-lolcow-blue"
        />
        <Label 
          htmlFor="featured" 
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-300"
        >
          Feature this content?
        </Label>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <Button 
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting || isUploading}
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          disabled={isSubmitting || isUploading || (!imageUrl && !initialData?.image_url)}
          className="bg-lolcow-blue hover:bg-lolcow-blue/90"
        >
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isSubmitting ? (initialData ? 'Updating...' : 'Adding...') : (initialData ? 'Update Content' : 'Add Content')}
        </Button>
      </div>
    </form>
  );
};

export default FeaturedContentForm;
