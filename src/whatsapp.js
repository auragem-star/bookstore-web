const axios = require('axios');

async function sendWhatsAppMessage(data) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    console.error('WhatsApp API credentials are missing in environment variables');
    return null;
  }

  const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response ? error.response.data : error.message);
    return null;
  }
}

async function sendTextMessage(to, text) {
  const data = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "text",
    text: { body: text }
  };
  return sendWhatsAppMessage(data);
}

/**
 * Send interactive buttons (Max 3 buttons)
 */
async function sendButtonsMessage(to, text, buttons) {
  // buttons: [{ id: 'id1', title: 'Title 1' }, ...]
  const formattedButtons = buttons.map(b => ({
    type: "reply",
    reply: {
      id: b.id,
      title: b.title.substring(0, 20) // WhatsApp limit is 20 chars
    }
  }));

  const data = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: text },
      action: {
        buttons: formattedButtons
      }
    }
  };
  return sendWhatsAppMessage(data);
}

/**
 * Send interactive list message (Max 10 rows total)
 */
async function sendListMessage(to, headerText, bodyText, footerText, buttonText, sections) {
  // sections: [{ title: 'Sec Title', rows: [{ id: 'row1', title: 'Row 1', description: 'Desc' }] }]
  const data = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "interactive",
    interactive: {
      type: "list",
      header: headerText ? { type: "text", text: headerText.substring(0, 60) } : undefined,
      body: { text: bodyText.substring(0, 1024) },
      footer: footerText ? { text: footerText.substring(0, 60) } : undefined,
      action: {
        button: buttonText.substring(0, 20),
        sections: sections.map(sec => ({
          title: sec.title.substring(0, 50),
          rows: sec.rows.map(row => ({
            id: row.id,
            title: row.title.substring(0, 24), // WhatsApp limit is 24 chars
            description: row.description ? row.description.substring(0, 72) : undefined // WhatsApp limit is 72 chars
          }))
        }))
      }
    }
  };
  return sendWhatsAppMessage(data);
}

module.exports = {
  sendTextMessage,
  sendButtonsMessage,
  sendListMessage
};
