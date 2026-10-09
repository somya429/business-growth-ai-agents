export interface DemoRequestPayload {
  name: string;
  email: string;
  businessType: string;
}

/**
 * Submit demo request form.
 * Currently simulates a network latency of 600ms.
 * TODO: Connect this to your production email / CRM service (e.g. Resend, HubSpot, Formspree) before public launch.
 */
export async function submitDemoRequest(payload: DemoRequestPayload): Promise<{ success: boolean }> {
  // Validate basic parameters client-side
  if (!payload.name.trim() || !payload.email.trim() || !payload.businessType) {
    throw new Error('All fields are required.');
  }

  // Artificial latency for realistic async experience
  await new Promise((resolve) => setTimeout(resolve, 600));

  return { success: true };
}
