import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "../../lib/utils"
import { Card, CardContent, CardHeader } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"

interface PricingCardProps {
  name: string
  price: string
  period?: string
  description: string
  features: string[]
  popular?: boolean
  ctaText?: string
  onSelect?: () => void
  className?: string
}

const PricingCard: React.FC<PricingCardProps> = ({
  name,
  price,
  period = "month",
  description,
  features,
  popular = false,
  ctaText = "Get Started",
  onSelect,
  className
}) => {
  return (
    <Card 
      variant={popular ? "elevated" : "default"} 
      className={cn(
        "relative h-full",
        popular && "border-primary shadow-xl scale-105",
        className
      )}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <Badge variant="default" className="shadow-sm">
            Most Popular
          </Badge>
        </div>
      )}
      
      <CardHeader className="text-center">
        <h3 className="text-title mb-sm">{name}</h3>
        <div className="mb-lg">
          <span className="text-display-2 font-bold text-text">{price}</span>
          {period && <span className="text-body text-muted">/{period}</span>}
        </div>
        <p className="text-body text-muted">{description}</p>
      </CardHeader>
      
      <CardContent className="flex flex-col h-full">
        <ul className="space-y-lg flex-1 mb-2xl">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success-subtle mt-0.5">
                <Check className="h-3 w-3 text-success" />
              </div>
              <span className="text-body text-text">{feature}</span>
            </li>
          ))}
        </ul>
        
        <Button
          variant={popular ? "primary" : "secondary"}
          size="lg"
          className="w-full"
          onClick={onSelect}
        >
          {ctaText}
        </Button>
      </CardContent>
    </Card>
  )
}

export { PricingCard }