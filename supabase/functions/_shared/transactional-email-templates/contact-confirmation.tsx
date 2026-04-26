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

const SITE_NAME = 'Guts & Gains Fitness'

interface ContactConfirmationProps {
  name?: string
  message?: string
}

const ContactConfirmationEmail = ({ name, message }: ContactConfirmationProps) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Bedankt voor je bericht aan {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>GUTS &amp; GAINS</Heading>
          <Text style={tagline}>FITNESS</Text>
        </Section>

        <Section style={content}>
          <Heading style={h1}>
            {name ? `Bedankt, ${name}!` : 'Bedankt voor je bericht!'}
          </Heading>
          <Text style={text}>
            We hebben je bericht in goede orde ontvangen. Pablo neemt binnen 24 uur
            persoonlijk contact met je op.
          </Text>

          {message && (
            <Section style={quoteBox}>
              <Text style={quoteLabel}>JOUW BERICHT</Text>
              <Text style={quoteText}>{message}</Text>
            </Section>
          )}

          <Text style={text}>
            In de tussentijd kun je ons volgen op Instagram{' '}
            <span style={accent}>@gutsngainsfitness</span> voor dagelijkse
            motivatie en trainingstips.
          </Text>

          <Text style={signature}>
            Talk soon,
            <br />
            <strong>Pablo Ramos</strong>
            <br />
            {SITE_NAME}
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactConfirmationEmail,
  subject: 'We hebben je bericht ontvangen — Guts & Gains Fitness',
  displayName: 'Contact bevestiging',
  previewData: {
    name: 'Jan',
    message: 'Ik wil graag een intake plannen voor personal training.',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: 0,
}
const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '0',
}
const header = {
  backgroundColor: '#0a0a0a',
  padding: '32px 24px',
  textAlign: 'center' as const,
}
const brand = {
  fontSize: '28px',
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
const content = {
  padding: '36px 28px',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#0a0a0a',
  margin: '0 0 18px',
  letterSpacing: '0.02em',
}
const text = {
  fontSize: '15px',
  color: '#3f3f46',
  lineHeight: '1.6',
  margin: '0 0 18px',
}
const accent = {
  color: '#dc2626',
  fontWeight: 'bold' as const,
}
const quoteBox = {
  backgroundColor: '#f4f4f5',
  borderLeft: '3px solid #dc2626',
  padding: '16px 20px',
  margin: '20px 0 24px',
}
const quoteLabel = {
  fontSize: '10px',
  color: '#71717a',
  letterSpacing: '0.25em',
  fontWeight: 'bold' as const,
  margin: '0 0 8px',
}
const quoteText = {
  fontSize: '14px',
  color: '#27272a',
  lineHeight: '1.5',
  margin: 0,
  fontStyle: 'italic' as const,
}
const signature = {
  fontSize: '14px',
  color: '#3f3f46',
  lineHeight: '1.6',
  margin: '28px 0 0',
}
