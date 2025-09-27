import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { XMarkIcon } from "@heroicons/react/24/outline"
import { useState } from "react"

interface CalculatorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onResult: (result: number) => void
}

export default function CalculatorModal({
  open,
  onOpenChange,
  onResult
}: CalculatorModalProps) {
  const [display, setDisplay] = useState("0")
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [operation, setOperation] = useState<string | null>(null)
  const [waitingForNewValue, setWaitingForNewValue] = useState(false)

  const inputNumber = (num: string) => {
    if (waitingForNewValue) {
      setDisplay(num)
      setWaitingForNewValue(false)
    } else {
      setDisplay(display === "0" ? num : display + num)
    }
  }

  const inputOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display)

    if (previousValue === null) {
      setPreviousValue(inputValue)
    } else if (operation) {
      const currentValue = previousValue || 0
      const newValue = calculate(currentValue, inputValue, operation)

      setDisplay(String(newValue))
      setPreviousValue(newValue)
    }

    setWaitingForNewValue(true)
    setOperation(nextOperation)
  }

  const calculate = (firstValue: number, secondValue: number, operation: string): number => {
    switch (operation) {
      case "+":
        return firstValue + secondValue
      case "-":
        return firstValue - secondValue
      case "×":
        return firstValue * secondValue
      case "÷":
        return firstValue / secondValue
      default:
        return secondValue
    }
  }

  const performCalculation = () => {
    const inputValue = parseFloat(display)

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation)
      setDisplay(String(newValue))
      setPreviousValue(null)
      setOperation(null)
      setWaitingForNewValue(true)
    }
  }

  const clear = () => {
    setDisplay("0")
    setPreviousValue(null)
    setOperation(null)
    setWaitingForNewValue(false)
  }

  const handleResult = () => {
    const result = parseFloat(display)
    onResult(result)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Calculator</DialogTitle>
          <DialogDescription>Calculate values for your transaction</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <Input
              value={display}
              readOnly
              className="text-right text-2xl font-mono border-none bg-transparent"
            />
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            <Button variant="outline" onClick={clear} className="col-span-2">
              Clear
            </Button>
            <Button variant="outline" onClick={() => inputOperation("÷")}>
              ÷
            </Button>
            <Button variant="outline" onClick={() => inputOperation("×")}>
              ×
            </Button>
            
            <Button variant="outline" onClick={() => inputNumber("7")}>7</Button>
            <Button variant="outline" onClick={() => inputNumber("8")}>8</Button>
            <Button variant="outline" onClick={() => inputNumber("9")}>9</Button>
            <Button variant="outline" onClick={() => inputOperation("-")}>
              -
            </Button>
            
            <Button variant="outline" onClick={() => inputNumber("4")}>4</Button>
            <Button variant="outline" onClick={() => inputNumber("5")}>5</Button>
            <Button variant="outline" onClick={() => inputNumber("6")}>6</Button>
            <Button variant="outline" onClick={() => inputOperation("+")}>
              +
            </Button>
            
            <Button variant="outline" onClick={() => inputNumber("1")}>1</Button>
            <Button variant="outline" onClick={() => inputNumber("2")}>2</Button>
            <Button variant="outline" onClick={() => inputNumber("3")}>3</Button>
            <Button variant="outline" onClick={performCalculation} className="row-span-2">
              =
            </Button>
            
            <Button variant="outline" onClick={() => inputNumber("0")} className="col-span-2">
              0
            </Button>
            <Button variant="outline" onClick={() => inputNumber(".")}>
              .
            </Button>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <XMarkIcon className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleResult}>
              Use Result
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
