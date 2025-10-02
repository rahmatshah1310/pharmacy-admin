"use client"

import { useState, Fragment } from 'react'
import { Combobox, Transition } from '@headlessui/react'
import { ChevronUpDownIcon, CheckIcon, PlusIcon } from '@heroicons/react/24/outline'
import { Button } from './button'

interface Category {
  _id: string
  name: string
}

interface CategoryComboboxProps {
  categories: Category[]
  selectedCategory: Category | null
  onCategorySelect: (category: Category | null) => void
  onAddCategory?: () => void
  placeholder?: string
  label?: string
  required?: boolean
}

export default function CategoryCombobox({
  categories,
  selectedCategory,
  onCategorySelect,
  onAddCategory,
  placeholder = "Search or select category",
  label = "Category",
  required = false
}: CategoryComboboxProps) {
  const [query, setQuery] = useState('')

  const filteredCategories =
    query === ''
      ? categories
      : categories.filter((category) =>
          category.name
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
        <Combobox value={selectedCategory} onChange={onCategorySelect}>
          <div className="relative">
            <Combobox.Input
              className="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              displayValue={(category: Category | null) => category?.name || ''}
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
              {filteredCategories.length === 0 && query !== '' ? (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                  No categories found.
                </div>
              ) : (
                filteredCategories.map((category) => (
                  <Combobox.Option
                    key={category._id}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${
                        active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                      }`
                    }
                    value={category}
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={`block truncate ${
                            selected ? 'font-medium' : 'font-normal'
                          }`}
                        >
                          {category.name}
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
        {onAddCategory && (
          <div className="flex justify-end mt-2">
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              onClick={onAddCategory} 
              aria-label="Add category"
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
