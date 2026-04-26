import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface AccountDeletionRequestProps {
  email?: string
  name?: string
  reason?: string
}

const AccountDeletionRequestEmail = ({
  email,
  name,
  reason,
}: AccountDeletionRequestProps) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Nieuw account-verwijderverzoek van {email || 'onbekend'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>VERWIJDERVERZOEK</Heading>
          <Text style={tagline}>ACCOUNT DELETION</Text>
        </Section>

        <Section style={content}>
          <Heading style={h1}>Iemand vraagt verwijdering aan</Heading>

          <Section style={detailsBox}>
            <Row label="EMAIL" value={email} />
            {name && <Row label="NAAM" value={name} />}
          </Section>

          <Text style={messageLabel}>REDEN</Text>
          <Section style={messageBox}>
            <Text style={messageText}>
              {reason || '(Geen reden opgegeven)'}
            </Text>
          </Section>

          <Text style={hint}>
            Verwerk dit verzoek in het admin dashboard onder "Klanten".
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

const Row = ({ label, value }: { label: string; value?: string }) => (
  <Section style={rowStyle}>
    <Text style={rowLabel}>{label}</Text>
    <Text style={rowValue}>{value || '—'}</Text>
  </Section>
)

export const template = {
  component: AccountDeletionRequestEmail,
  subject: (data: Record<string, any>) =>
    `Nieuw verwijderverzoek${data.email ? `: ${data.email}` : ''}`,
  // Always send to the site owner — overrides caller's recipientEmail.
  to: 'gutsgainsfitness@gmail.com',
  displayName: 'Account verwijderverzoek (admin)',
  previewData: {
    email: 'klant@example.com',
    name: 'Jan Jansen',
    reason: 'Ik gebruik de app niet meer.',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: 0,
}
const container = { maxWidth: '560px', margin: '0 auto', padding: '0' }
const header = {
  backgroundColor: '#0a0a0a',
  padding: '28px 24px',
  textAlign: 'center' as const,
}
const brand = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#ffffff',
  letterSpacing: '0.15em',
  margin: 0,
  fontFamily: 'Impact, "Arial Black", sans-serif',
}
const tagline = {
  fontSize: '11px',
  color: '#dc2626',
  letterSpacing: '0.4em',
  margin: '6px 0 0',
  fontWeight: 'bold',
}
const content = { padding: '32px 28px' }
const h1 = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#0a0a0a',
  margin: '0 0 22px',
}
const detailsBox = {
  backgroundColor: '#fafafa',
  border: '1px solid #e4e4e7',
  borderRadius: '4px',
  padding: '8px 16px',
  margin: '0 0 24px',
}
const rowStyle = { padding: '10px 0', borderBottom: '1px solid #e4e4e7' }
const rowLabel = {
  fontSize: '10px',
  color: '#71717a',
  letterSpacing: '0.2em',
  fontWeight: 'bold' as const,
  margin: '0 0 4px',
}
const rowValue = {
  fontSize: '15px',
  color: '#0a0a0a',
  margin: 0,
}
const messageLabel = {
  fontSize: '10px',
  color: '#71717a',
  letterSpacing: '0.2em',
  fontWeight: 'bold' as const,
  margin: '0 0 8px',
}
const messageBox = {
  backgroundColor: '#fafafa',
  borderLeft: '3px solid #dc2626',
  padding: '14px 18px',
  margin: '0 0 24px',
}
const messageText = {
  fontSize: '15px',
  color: '#27272a',
  lineHeight: '1.6',
  margin: 0,
  whiteSpace: 'pre-wrap' as const,
}
const hint = {
  fontSize: '13px',
  color: '#71717a',
  margin: '16px 0 0',
  fontStyle: 'italic' as const,
}