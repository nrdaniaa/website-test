'use client'

import { AppSidebar } from "@/components/app-sidebar"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import {
    Field,
    FieldDescription,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useEffect, useRef, useState } from "react"
import Image from "next/image"

interface ImageData {
    id: number
    url: string
    description?: string
    createdAt: string
}

export function InputFile() {
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [preview, setPreview] = useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        // Revoke previous URL to free memory
        if (preview) {
            URL.revokeObjectURL(preview)
        }

        setFile(selectedFile)

        // create preview URL
        const imageUrl = URL.createObjectURL(selectedFile)
        setPreview(imageUrl)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append("file", file)

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
                method: "POST",
                body: formData,
            })

            if (response.ok) {
                setFile(null)
                if (fileInputRef.current) {
                    fileInputRef.current.value = ""
                }
                // Revoke preview URL to clear it
                if (preview) {
                    URL.revokeObjectURL(preview)
                    setPreview(null)
                }
                // Trigger refresh of image list
                window.dispatchEvent(new Event("imageUploaded"))
            }
        } catch (error) {
            console.error("Upload failed:", error)
        } finally {
            setUploading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 ">
            <Field>
                <FieldLabel htmlFor="picture">Picture</FieldLabel>
                <Input
                    id="picture"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                />
                {preview && (
                    <div className="mt-3">
                        <p className="text-sm text-gray-500 mb-2">Preview:</p>
                        <img
                            src={preview}
                            alt="Preview"
                            className="w-16 h-16 object-cover rounded border"
                        />
                    </div>
                )}
                <FieldDescription>Select a picture to upload.</FieldDescription>
            </Field>
            <div className="flex gap-2">
                <Button
                    type="reset"
                    variant="outline"
                    onClick={() => {
                        setFile(null)
                        if (fileInputRef.current) {
                            fileInputRef.current.value = ""
                        }
                        // Revoke preview URL and clear preview
                        if (preview) {
                            URL.revokeObjectURL(preview)
                            setPreview(null)
                        }
                    }}
                >
                    Reset
                </Button>
                <Button type="submit" disabled={!file || uploading}>
                    {uploading ? "Uploading..." : "Submit"}
                </Button>
            </div>
        </form>
    )
}

export function ImageGallery() {
    const [images, setImages] = useState<ImageData[]>([])
    const [loading, setLoading] = useState(true)

    const fetchImages = async () => {
        try {
            setLoading(true)
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/images`)
            const data = await response.json()
            setImages(data.images || [])
        } catch (error) {
            console.error("Failed to fetch images:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchImages()

        // Listen for image upload event
        window.addEventListener("imageUploaded", fetchImages)
        return () => window.removeEventListener("imageUploaded", fetchImages)
    }, [])

    if (loading) {
        return <div>Loading images...</div>
    }

    return (
        <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Uploaded Images</h2>

            {images.length === 0 ? (
                <p className="text-gray-500">No images uploaded yet.</p>
            ) : (
                <div className="flex flex-col gap-4 p-4 border-t border-gray-400  ">
                    {images.map((image) => (
                        <div
                            key={image.id}
                            className="border border-gray-400 rounded-lg p-4 bg-gray-100 shadow-sm"
                        >
                            <div className="flex justify-between items-center text-xs text-gray-600 mb-2">
                                <span></span>
                                <span>{new Date(image.createdAt).toLocaleString()}</span>
                            </div>

                            <div className="flex gap-4 items-center">
                            <img src={`${process.env.NEXT_PUBLIC_API_URL}${image.url}`}
                                    alt={`Image ${image.id}`}
                                    className="w-16 h-16 object-cover rounded flex-none"
                                />
                                <div className="flex-1 p-2 items-center justify-start text-xs">
                                    <p className="text-gray-700 mt-1">
                                        {image.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function uploadImage() {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b">
                    <div className="flex items-center gap-2 px-3">
                        <SidebarTrigger />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    {/* <BreadcrumbLink href="/uploadImage">upload image</BreadcrumbLink> */}
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Upload Images</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>
                <div className="flex flex-col p-4">
                    <div className="max-w-md">
                        <InputFile />
                    </div>
                    <ImageGallery />
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
