import { LoadingState } from "../components/ui/loading";
import { Background } from "../components/ui/background";
import { Section } from "../components/ui/section";

export default function Loading() {
  return (
    <Background variant="gradient">
      <Section spacing="xl" className="min-h-screen flex items-center justify-center">
        <LoadingState>
          Loading your experience...
        </LoadingState>
      </Section>
    </Background>
  );
}