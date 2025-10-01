import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function ZohoExportInstructions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Instructions</CardTitle>
        <CardDescription>
          Follow these steps to import the exported data into Zoho CRM
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Important</AlertTitle>
          <AlertDescription>
            Import files in the exact order shown below to maintain data relationships
          </AlertDescription>
        </Alert>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="step-1">
            <AccordionTrigger>Step 1: Import VC Funds (VC_Funds.csv)</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <p>• Navigate to: Settings → Data Administration → Import → Accounts</p>
              <p>• Upload <code className="bg-muted px-1 rounded">VC_Funds.csv</code></p>
              <p>• Map "Aurora_ID" as a custom field</p>
              <p>• This creates your VC Fund Accounts</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step-2">
            <AccordionTrigger>Step 2: Import Jurors (Jurors.csv)</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <p>• Navigate to: Settings → Data Administration → Import → Contacts</p>
              <p>• Upload <code className="bg-muted px-1 rounded">Jurors.csv</code></p>
              <p>• Map "Account Name" to link Contacts to VC Funds</p>
              <p>• Map "Aurora_ID" as a custom field</p>
              <p>• This links jurors to their VC Funds</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step-3">
            <AccordionTrigger>Step 3: Import Startups (Startups.csv)</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <p>• Navigate to: Settings → Data Administration → Import → Accounts</p>
              <p>• Upload <code className="bg-muted px-1 rounded">Startups.csv</code></p>
              <p>• Map Aurora_Screening_Avg_Score, Aurora_Pitching_Avg_Score, Aurora_Overall_Avg_Score as custom fields</p>
              <p>• This creates your Startup Accounts with average scores</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step-4">
            <AccordionTrigger>Step 4: Import Founders (Founders.csv)</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <p>• Navigate to: Settings → Data Administration → Import → Contacts</p>
              <p>• Upload <code className="bg-muted px-1 rounded">Founders.csv</code></p>
              <p>• Map "Account Name" to link Contacts to Startups</p>
              <p>• This links founders to their startups</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step-5">
            <AccordionTrigger>Step 5: Import Deals (Deals.csv)</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <p>• Navigate to: Settings → Data Administration → Import → Deals</p>
              <p>• Upload <code className="bg-muted px-1 rounded">Deals.csv</code></p>
              <p>• Map "Account Name" to link Deals to Startup Accounts</p>
              <p>• Map Aurora_Deal_ID and Aurora_Startup_ID as custom fields</p>
              <p>• This creates Deals tracking each startup's Aurora journey</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step-6">
            <AccordionTrigger>Step 6: Import Contact Roles (Deal_Contact_Roles.csv)</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <p>• Navigate to: Settings → Data Administration → Import → Contact Roles (or Deals module)</p>
              <p>• Upload <code className="bg-muted px-1 rounded">Deal_Contact_Roles.csv</code></p>
              <p>• Map "Deal Name" to link to Deals, "Contact Email" to link to Jurors</p>
              <p>• This connects Jurors to Deals showing who evaluated each startup</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="mt-4 p-3 bg-muted rounded-md text-sm space-y-1">
          <p><strong>💡 Pro Tip:</strong></p>
          <p>Use "Aurora_ID" fields to avoid duplicates on re-imports</p>
        </div>
      </CardContent>
    </Card>
  );
}
