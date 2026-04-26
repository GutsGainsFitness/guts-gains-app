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

interface BookingConfirmationProps {
  name?: string
  date?: string
  time?: string
  location?: string
}

const BookingConfirmationEmail = ({
  name,
  date,
  time,
  location,
}: BookingConfirmationProps) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Je PT-sessie bij {SITE_NAME} is bevestigd</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>GUTS &amp; GAINS</Heading>
          <Text style={tagline}>FITNESS</Text>
        </Section>

        <Section style={content}>
          <Heading style={h1}>
            {name ? `Bevestigd, ${name}!` : 'Je sessie is bevestigd!'}
          </Heading>
          <Text style={text}>
            Je PT-sessie bij Pablo staat in de agenda. Hieronder vind je de
            details. Tot dan — kom uitgerust en hydrated.
          </Text>

          <Section style={detailBox}>
            <Text style={detailLabel}>JOUW SESSIE</Text>
            {date && (
              <Text style={detailRow}>
                <span style={detailKey}>Datum: </span>
                <span style={detailValue}>{date}</span>
              </Text>
            )}
            {time && (
              <Text style={detailRow}>
                <span style={detailKey}>Tijd: </span>
                <span style={detailValue}>{time}</span>
              </Text>
            )}
            <Text style={detailRow}>
              <span style={detailKey}>Duur: </span>
              <span style={detailValue}>60 minuten</span>
            </Text>
            {location && (
              <Text style={detailRow}>
                <span style={detailKey}>Locatie: </span>
                <span style={detailValue}>{location}</span>
              </Text>
            )}
          </Section>

          <Text style={text}>
            <strong>Niet aanwezig?</strong> Annuleer of verplaats minimaal 24
            uur van tevoren via WhatsApp, anders wordt de sessie volledig in
            rekening gebracht.
          </Text>

          <Text style={signature}>
            See you in the gym,
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
  component: BookingConfirmationEmail,
  subject: 'Je PT-sessie is bevestigd — Guts & Gains Fitness',
  displayName: 'PT-boeking bevestiging',
  previewData: {
    name: 'Jan',
    date: 'maandag 28 april 2026',
    time: '18:00',
    location: 'Den Haag',
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
const detailBox = {
  backgroundColor: '#0a0a0a',
  borderLeft: '3px solid #dc2626',
  padding: '20px 24px',
  margin: '20px 0 24px',
}
const detailLabel = {
  fontSize: '10px',
  color: '#dc2626',
  letterSpacing: '0.3em',
  fontWeight: 'bold' as const,
  margin: '0 0 14px',
}
const detailRow = {
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 6px',
}
const detailKey = {
  color: '#a1a1aa',
}
const detailValue = {
  color: '#ffffff',
  fontWeight: 'bold' as const,
}
const signature = {
  fontSize: '14px',
  color: '#3f3f46',
  lineHeight: '1.6',
  margin: '28px 0 0',
}
