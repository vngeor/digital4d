"use client"

import { useState, useRef } from "react"
import { useTranslations } from "next-intl"
import { X, Upload, File, Loader2, CheckCircle } from "lucide-react"

interface QuoteFormProps {
    productId?: string
    productName?: string
    onClose: () => void
    isOrderInquiry?: boolean
}

export function QuoteForm({ productId, productName, onClose, isOrderInquiry }: QuoteFormProps) {
    const t = useTranslations("quotes")
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        message: "",
    })

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0])
        }
    }

    const handleFileSelect = (file: File) => {
        const allowedExtensions = [".stl", ".obj", ".3mf"]
        const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf("."))

        if (!allowedExtensions.includes(fileExtension)) {
            setError("Invalid file type. Allowed: STL, OBJ, 3MF")
            return
        }

        if (file.size > 50 * 1024 * 1024) {
            setError("File too large. Maximum size is 50MB.")
            return
        }

        setError(null)
        setSelectedFile(file)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const submitData = new FormData()
            submitData.append("name", formData.name)
            submitData.append("email", formData.email)
            if (formData.phone) submitData.append("phone", formData.phone)
            if (formData.message) submitData.append("message", formData.message)
            if (productId) submitData.append("productId", productId)
            if (selectedFile) submitData.append("file", selectedFile)

            const res = await fetch("/api/quotes", {
                method: "POST",
                body: submitData,
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Failed to submit")
            }

            setSuccess(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : t("error"))
        } finally {
            setLoading(false)
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="glass-strong rounded-t-2xl sm:rounded-2xl border border-white/10 w-full sm:max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            {isOrderInquiry ? "Order Inquiry" : t("title")}
                        </h2>
                        {productName && (
                            <p className="text-sm text-gray-400 mt-1">{productName}</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {success ? (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{t("success")}</h3>
                        <p className="text-gray-400 mb-6">{t("successMessage")}</p>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    {t("name")} <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={t("namePlaceholder")}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                                />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    {t("email")} <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder={t("emailPlaceholder")}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                {t("phone")}
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => {
                                    // Only allow numbers, spaces, +, -, and ()
                                    const value = e.target.value.replace(/[^0-9+\-\s()]/g, "")
                                    setFormData({ ...formData, phone: value })
                                }}
                                pattern="[0-9+\-\s()]{6,20}"
                                placeholder={t("phonePlaceholder")}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                {t("message")}
                            </label>
                            <textarea
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                placeholder={t("messagePlaceholder")}
                                rows={4}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                            />
                        </div>

                        {/* File Upload - Only show for quote requests, not order inquiries */}
                        {!isOrderInquiry && (
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    {t("uploadFile")}
                                </label>
                                <div
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                                        dragActive
                                            ? "border-emerald-500 bg-emerald-500/10"
                                            : "border-white/20 hover:border-white/40 bg-white/5"
                                    }`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".stl,.obj,.3mf"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                handleFileSelect(e.target.files[0])
                                            }
                                        }}
                                    />

                                    {selectedFile ? (
                                        <div className="flex items-center justify-center gap-3">
                                            <File className="w-8 h-8 text-emerald-400" />
                                            <div className="text-left">
                                                <p className="text-white font-medium">{selectedFile.name}</p>
                                                <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSelectedFile(null)
                                                }}
                                                className="p-1 rounded-lg hover:bg-white/10"
                                            >
                                                <X className="w-4 h-4 text-gray-400" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-10 h-10 mx-auto mb-3 text-gray-500" />
                                            <p className="text-gray-400 mb-1">{t("uploadHelp")}</p>
                                            <p className="text-xs text-gray-500">{t("supportedFormats")}</p>
                                            <p className="text-xs text-gray-500">{t("maxFileSize")}</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {t("submitting")}
                                </>
                            ) : (
                                t("submit")
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
