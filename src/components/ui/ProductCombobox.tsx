"use client"

import { useState, Fragment } from 'react'
import { Combobox, Transition } from '@headlessui/react'
import { ChevronUpDownIcon, CheckIcon, PlusIcon } from '@heroicons/react/24/outline'
import { Button } from './button'

interface Product {
  _id: string
  name: string
  category?: string
}

interface ProductComboboxProps {
  products: Product[]
  selectedProduct: Product | null
  onProductSelect: (product: Product | null) => void
  onAddProduct?: () => void
  placeholder?: string
  label?: string
  required?: boolean
}

export default function ProductCombobox({
  products,
  selectedProduct,
  onProductSelect,
  onAddProduct,
  placeholder = "Search or select product",
  label = "Product",
  required = false
}: ProductComboboxProps) {
  const [query, setQuery] = useState('')

  const filteredProducts =
    query === ''
      ? products
      : products.filter((p) =>
          p.name
            .toLowerCase()
            .replace(/\s+/g, '')
            .includes(query.toLowerCase().replace(/\s+/g, ''))
        )

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <Combobox value={selectedProduct} onChange={onProductSelect}>
          <div className="relative">
            <Combobox.Input
              className="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              displayValue={(product: Product | null) => product?.name || ''}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </Combobox.Button>
          </div>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {filteredProducts.length === 0 && query !== '' ? (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                  No products found.
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <Combobox.Option
                    key={product._id}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${
                        active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                      }`
                    }
                    value={product}
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={`block truncate ${
                            selected ? 'font-medium' : 'font-normal'
                          }`}
                        >
                          {product.name}
                        </span>
                        {selected ? (
                          <span
                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                              active ? 'text-white' : 'text-indigo-600'
                            }`}
                          >
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Combobox.Option>
                ))
              )}
            </Combobox.Options>
          </Transition>
        </Combobox>
        {onAddProduct && (
          <div className="flex justify-end mt-2">
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              onClick={onAddProduct} 
              aria-label="Add product"
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}


