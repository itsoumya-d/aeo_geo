export async function syncHubSpotEvent(
    token: string,
    email: string,
    eventType: string,
    properties: Record<string, any>
) {
    if (!token) {
        return;
    }

    try {
        // 1. Find Contact by Email
        const searchRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: email }] }]
            })
        });

        const searchData = await searchRes.json();
        let contactId = searchData.results?.[0]?.id;

        // 2. Create Contact if missing (Upsert)
        if (!contactId) {
            const createRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    properties: { email, ...properties }
                })
            });
            const createData = await createRes.json();
            contactId = createData.id;
        }

        // 3. Create Timeline Event (Custom Event)
        // For MVP, logging a Note.
        const noteRes = await fetch("https://api.hubapi.com/crm/v3/objects/notes", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                properties: {
                    hs_timestamp: Date.now(),
                    hs_note_body: `
                        <strong>Sentinel Audit Completed</strong><br/>
                        Event: ${eventType}<br/>
                        Domain: ${properties.domain}<br/>
                        Score: ${properties.score}
                    `
                },
                associations: [
                    {
                        to: { id: contactId },
                        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }]
                    }
                ]
            })
        });

        if (!noteRes.ok) {
            console.error("HubSpot Note Failed:", await noteRes.text());
        }

    } catch (error) {
        console.error("HubSpot Sync Error:", error);
    }
}
