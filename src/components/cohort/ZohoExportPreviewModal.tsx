import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ZohoExportPreviewModalProps {
  open: boolean;
  onClose: () => void;
}

export function ZohoExportPreviewModal({ open, onClose }: ZohoExportPreviewModalProps) {
  const sampleVCFunds = `Account Name,Account Type,Industry,Aurora_Tag,Aurora_ID,Number_of_Jurors,Notes
"TechVentures Capital","Partner","Venture Capital","Aurora VC Partner","vcf_001","3","Active jurors: Sarah Johnson, Michael Chen, Emily Rodriguez"
"Innovation Partners","Partner","Venture Capital","Aurora VC Partner","vcf_002","2","Active jurors: David Kim, Lisa Wang"`;

  const sampleJurors = `First Name,Last Name,Email,Title,Account Name,LinkedIn,Aurora_Role,Aurora_ID,Notes
"Sarah","Johnson","sarah@techventures.com","Senior Partner","TechVentures Capital","linkedin.com/in/sarah","Juror","j_001","Calendly: calendly.com/sarah | Preferred Verticals: AI/ML, Fintech"
"Michael","Chen","michael@techventures.com","Associate","TechVentures Capital","linkedin.com/in/michael","Juror","j_002","Preferred Regions: Europe, North America"`;

  const sampleStartups = `Account Name,Website,Industry,Description,Stage,Country,Aurora_Screening_Score,Aurora_Final_Status,Aurora_ID,Notes
"TechFlow AI","techflow.ai","Artificial Intelligence (AI/ML)","AI-powered workflow automation","Seed","United Kingdom","8.5","Selected","s_001","Additional Verticals: Enterprise Software | Pitch Deck: https://..."
"GreenEnergy Solutions","greenenergy.io","Clean Energy","Solar panel optimization","Series A","Germany","7.8","Selected","s_002","Key Metrics: MRR €100k"`;

  const sampleFounders = `First Name,Last Name,Email,Account Name,Title,Aurora_Startup_ID,Notes
"Alex","Chen","contact@techflow.ai","TechFlow AI","Co-Founder","s_001","Founder 1 of 2"
"Maria","Rodriguez","contact@techflow.ai","TechFlow AI","Co-Founder","s_001","Founder 2 of 2"`;

  const sampleEvaluations = `Related_To_Account,Related_To_Aurora_ID,Note_Title,Note_Content,Created_Time,Aurora_ID
"TechFlow AI","s_001","Screening Evaluation - Sarah Johnson","Round: Screening
Juror: Sarah Johnson
Score: 8.5/10
Status: Submitted

Strengths:
- Strong technical team
- Clear market opportunity","2025-02-15 14:30:00","eval_001"`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Sample Export Data</DialogTitle>
          <DialogDescription>
            Preview of first few rows from each CSV file
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="vc-funds" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="vc-funds">VC Funds</TabsTrigger>
            <TabsTrigger value="jurors">Jurors</TabsTrigger>
            <TabsTrigger value="startups">Startups</TabsTrigger>
            <TabsTrigger value="founders">Founders</TabsTrigger>
            <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
          </TabsList>

          <TabsContent value="vc-funds">
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <pre className="text-xs whitespace-pre-wrap font-mono">
                {sampleVCFunds}
              </pre>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="jurors">
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <pre className="text-xs whitespace-pre-wrap font-mono">
                {sampleJurors}
              </pre>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="startups">
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <pre className="text-xs whitespace-pre-wrap font-mono">
                {sampleStartups}
              </pre>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="founders">
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <pre className="text-xs whitespace-pre-wrap font-mono">
                {sampleFounders}
              </pre>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="evaluations">
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <pre className="text-xs whitespace-pre-wrap font-mono">
                {sampleEvaluations}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
