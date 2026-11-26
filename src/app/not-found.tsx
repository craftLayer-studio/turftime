import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { EmptyState } from "@astryxdesign/core/EmptyState";

export default function NotFound() {
  return (
    <Center role="main" axis="both" padding={10}>
      <EmptyState title="Page not found" description="The link may be old or mistyped." actions={<Button label="Go home" href="/" variant="primary" />} />
    </Center>
  );
}
