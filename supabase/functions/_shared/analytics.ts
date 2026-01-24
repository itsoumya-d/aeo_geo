export async function trackEvent(
    clientId: string,
    eventName: string,
    params: Record<string, any> = {}
) {
    const measurementId = Deno.env.get("GA4_MEASUREMENT_ID");
    const apiSecret = Deno.env.get("GA4_API_SECRET");

    if (!measurementId || !apiSecret) {
        console.warn("GA4_MEASUREMENT_ID or GA4_API_SECRET not configured. Skipping event tracking.");
        return;
    }

    try {
        const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;

        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({
                client_id: clientId,
                events: [{
                    name: eventName,
                    params: {
                        ...params,
                        engagement_time_msec: "1"
                    }
                }]
            })
        });

        if (!response.ok) {
            console.error(`GA4 Track Event Failed: ${response.status} ${await response.text()}`);
        }
    } catch (error) {
        console.error("GA4 Track Event Error:", error);
    }
}
