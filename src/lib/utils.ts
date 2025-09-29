import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { toast, type ToastOptions } from "react-toastify"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(
  amount: number | string | null | undefined,
  options: { currencySymbol?: string; minimumFractionDigits?: number; maximumFractionDigits?: number } = {}
) {
  const {
    currencySymbol = 'Rs.',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options
  const value = Number(amount ?? 0)
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits,
    maximumFractionDigits,
  })
  return `${currencySymbol} ${formatted}`
}

const defaultToastOptions: ToastOptions = { autoClose: 4000, position: "top-right", pauseOnHover: true, closeOnClick: true }

export const notify = {
  success(message: string, options?: ToastOptions) {
    return toast.success(message, { ...defaultToastOptions, ...options })
  },
  error(message: string, options?: ToastOptions) {
    return toast.error(message, { ...defaultToastOptions, ...options })
  },
  info(message: string, options?: ToastOptions) {
    return toast.info(message, { ...defaultToastOptions, ...options })
  },
  promise<T>(promise: Promise<T>, messages: { loading: string; success: string; error: string }, options?: ToastOptions) {
    return toast.promise(promise, {
      pending: messages.loading,
      success: messages.success,
      error: messages.error,
    }, { ...defaultToastOptions, ...options })
  },
}

// ---------- Reusable Export / Print Utilities ----------

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function exportToJSON(data: unknown, filename: string = 'export.json') {
  try {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    downloadBlob(blob, filename)
    notify.success('Exported JSON successfully')
  } catch (err: any) {
    notify.error(err?.message || 'Failed to export JSON')
  }
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

export function exportToCSV(rows: Array<Record<string, any>>, filename: string = 'export.csv') {
  try {
    if (!rows || rows.length === 0) {
      downloadBlob(new Blob(['']), filename)
      notify.info('No data to export')
      return
    }
    const allKeys = Array.from(
      rows.reduce((set: Set<string>, row) => {
        Object.keys(row || {}).forEach(k => set.add(k))
        return set
      }, new Set<string>())
    )
    const header = allKeys.join(',')
    const lines = rows.map(row => allKeys.map(k => csvEscape(row?.[k])).join(','))
    const csv = [header, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    downloadBlob(blob, filename)
    notify.success('Exported CSV successfully')
  } catch (err: any) {
    notify.error(err?.message || 'Failed to export CSV')
  }
}

export function printHTML(html: string, title: string = 'Print') {
  try {
    // Create a hidden iframe for printing instead of opening a new window
    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.left = '-9999px'
    iframe.style.top = '-9999px'
    iframe.style.width = '1px'
    iframe.style.height = '1px'
    iframe.style.border = 'none'
    
    document.body.appendChild(iframe)
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) throw new Error('Failed to create iframe document')
    
    iframeDoc.open()
    iframeDoc.write(`<!doctype html><html><head><title>${title}</title>
      <style>
        @page { margin: 8mm }
        body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; }
      </style>
    </head><body>${html}</body></html>`)
    iframeDoc.close()
    
    // Wait for content to load, then print and cleanup
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print()
        setTimeout(() => {
          document.body.removeChild(iframe)
        }, 1000) // Remove iframe after printing
      }, 100)
    }
  } catch (err: any) {
    notify.error(err?.message || 'Failed to print')
  }
}

export function printElementById(elementId: string, title: string = 'Print') {
  const el = document.getElementById(elementId)
  if (!el) {
    notify.error('Element not found')
    return
  }
  printHTML(el.outerHTML, title)
}

// ---------- PDF Export (Direct Download) ----------
async function ensureHtml2PdfLoaded() {
  const w = window as any
  if (w.html2pdf) return
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load PDF library'))
    document.body.appendChild(script)
  })
}

export async function exportElementToPDF(elementId: string, filename: string = 'export.pdf') {
  try {
    const el = document.getElementById(elementId)
    if (!el) {
      notify.error('Element not found for PDF export')
      return
    }
    await ensureHtml2PdfLoaded()
    const w = window as any
    const opt = {
      margin:       10,
      filename:     filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
      image:        { type: 'jpeg', quality: 0.95 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }
    await w.html2pdf().set(opt).from(el).save()
    notify.success('Exported PDF successfully')
  } catch (err: any) {
    notify.error(err?.message || 'Failed to export PDF')
  }
}

// ---------- POS Receipt Printing ----------

type ReceiptItem = { name: string; price: number; quantity: number }
type ReceiptSale = {
  _id?: string
  items: ReceiptItem[]
  subtotal?: number
  tax?: number
  discount?: number
  total: number
  paymentMethod?: string
  createdAt?: string
  customerId?: string | null
}

function formatDateTime(dt: string | Date | undefined) {
  try {
    const d = dt ? new Date(dt) : new Date()
    return d.toLocaleString()
  } catch {
    return new Date().toLocaleString()
  }
}

export function printPosReceipt(sale: ReceiptSale, options?: { storeName?: string; addressLine1?: string; addressLine2?: string; footerNote?: string }) {
  const storeName = options?.storeName ?? 'Pharmacy POS'
  const address1 = options?.addressLine1 ?? ''
  const address2 = options?.addressLine2 ?? ''
  const footer = options?.footerNote ?? 'Thank you for your purchase!'

  const itemsHtml = (sale.items || []).map(it => {
    const lineTotal = (Number(it.price) || 0) * (Number(it.quantity) || 0)
    return `<tr>
      <td>${csvEscape(it.name)}</td>
      <td style="text-align:right">${formatCurrency(it.price)}</td>
      <td style="text-align:right">${it.quantity}</td>
      <td style="text-align:right">${formatCurrency(lineTotal)}</td>
    </tr>`
  }).join('')

  const summaryRows = [
    sale.subtotal != null ? `<tr><td colspan="3">Subtotal</td><td style="text-align:right">${formatCurrency(sale.subtotal)}</td></tr>` : '',
    sale.discount ? `<tr><td colspan="3">Discount</td><td style="text-align:right">-${sale.discount}%</td></tr>` : '',
    sale.tax ? `<tr><td colspan="3">Tax</td><td style="text-align:right">${formatCurrency(sale.tax)}</td></tr>` : '',
    `<tr><td colspan="3"><strong>Total</strong></td><td style="text-align:right"><strong>${formatCurrency(sale.total)}</strong></td></tr>`
  ].filter(Boolean).join('')

  const html = `
  <div style="width: 280px; margin: 0 auto;">
    <div style="text-align:center; margin-bottom:8px;">
      <div style="font-weight:700;">${csvEscape(storeName)}</div>
      ${address1 ? `<div>${csvEscape(address1)}</div>` : ''}
      ${address2 ? `<div>${csvEscape(address2)}</div>` : ''}
    </div>
    <div style="font-size:11px; margin-bottom:6px;">
      <div>Receipt: ${csvEscape(sale._id || '')}</div>
      <div>Date: ${formatDateTime(sale.createdAt)}</div>
      <div>Customer: ${csvEscape(sale.customerId || 'Walk-in')}</div>
      <div>Payment: ${csvEscape(sale.paymentMethod || '')}</div>
    </div>
    <table style="width:100%; border-collapse:collapse;">
      <thead>
        <tr>
          <th style="text-align:left">Item</th>
          <th style="text-align:right">Price</th>
          <th style="text-align:right">Qty</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>${summaryRows}</tfoot>
    </table>
    <div style="text-align:center; margin-top:8px;">${csvEscape(footer)}</div>
  </div>`

  printHTML(html, 'POS Receipt')
}

