"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start justify-between gap-3 overflow-hidden rounded-lg border border-white/10 bg-[#11141d] p-3 pr-8 text-sm text-white shadow-lg transition-all",
  {
    variants: {
      variant: {
        default: "",
        destructive: "border-red-500/40 bg-red-900/20 text-red-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function ToastViewport({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed right-0 top-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:top-auto sm:max-w-[420px] sm:flex-col",
        className
      )}
      {...props}
    />
  )
}

function Toast({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof toastVariants>) {
  return <div className={cn(toastVariants({ variant }), className)} {...props} />
}

function ToastTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("text-sm font-semibold", className)} {...props} />
}

function ToastDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("text-xs text-white/80", className)} {...props} />
}

function ToastClose({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "absolute right-2 top-2 rounded-md p-1 text-white/60 transition-colors hover:text-white",
        className
      )}
      {...props}
    >
      <X className="size-4" />
    </button>
  )
}

export { Toast, ToastClose, ToastDescription, ToastTitle, ToastViewport }
