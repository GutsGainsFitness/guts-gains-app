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

interface ContactNotificationProps {
  name?: string
  email?: string
  phone?: string
  subject?: string
  message?: string
}

const ContactNotificationEmail = ({
  name,
  email,
  phone,
  subject,
  message,
}: ContactNotificationProps) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Nieuw contactbericht van {name || 'website bezoeker'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>NIEUW BERICHT</Heading>
          <Text style={tagline}>VIA WEBSITE</Text>
        </Section>

        <Section style={content}>
          <Heading style={h1}>Iemand heeft contact opgenomen</Heading>

          <Section style={detailsBox}>
            <Row label="NAAM" value={name} />
            <Row label="EMAIL" value={email} />
            {phone && <Row label="TELEFOON" value={phone} />}
            {subject && <Row label="ONDERWERP" value={subject} />}
          </Section>

          {message && (
            <>
              <Text style={messageLabel}>BERICHT</Text>
              <Section style={messageBox}>
                <Text style={messageText}>{message}</Text>
              </Section>
            </>
          )}

          <Text style={hint}>
            Reageer direct via "Antwoorden" — dat gaat naar{' '}
            <strong>{email}</strong>.
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
  component: ContactNotificationEmail,
  subject: (data: Record<string, any>) =>
    `Nieuw contactbericht${data.name ? ` van ${data.name}` : ''}${
      data.subject ? ` — ${data.subject}` : ''
    }`,
  displayName: 'Contact notificatie (admin)',
  previewData: {
    name: 'Jan Jansen',
    email: 'jan@example.com',
    phone: '0612345678',
    subject: 'Intake aanvraag',
    message: 'Hoi Pablo, ik wil graag een intake plannen voor personal training.',
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
