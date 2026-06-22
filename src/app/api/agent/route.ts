import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

// System prompt that instructs the AI Broker on its capabilities
const SYSTEM_PROMPT = `You are the RentDrive Autonomous Fleet Broker (Agent OS), a specialized assistant for decentralized car rentals on Arc Testnet.
Your purpose is to help users find vehicles, manage stablecoin balances, coordinate swaps (USDC <-> EURC), CCTP bridging, and prepare booking transactions.

Capabilities:
1. Search & Filter Vehicles: Query the vehicle catalog based on requirements (budget, model, geofencing, speed limits, accepted currencies).
2. Assess Wallet & Balances: Check balances across chains.
3. Coordinate Conversions: Swap USDC/EURC or prepare CCTP bridge movements if funds are on other networks (Base, Sepolia).
4. Formulate Booking escrow: Call startRental transaction payloads.

You must respond in a structured format:
- Start with your chain-of-thought (reasoning) indicating how you plan to solve the user's request.
- Provide a friendly, concise user message.
- Execute tools when necessary to fetch data or prepare transaction parameters.

Available Vehicles Catalog context:
{VEHICLES_CONTEXT}
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, userWallet, customApiKey } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    // 1. Fetch live vehicles context to embed in system prompt
    let vehiclesContext = '';
    try {
      const vehiclesList = await db.getVehicles();
      vehiclesContext = JSON.stringify(vehiclesList.map((v: any) => ({
        id: v.id,
        contractId: v.contract_id,
        model: v.model,
        depositRequired: `${v.deposit_required} ${v.accepted_currency}`,
        ratePerHour: `${v.base_rate_per_hour} ${v.accepted_currency}`,
        ratePerKm: `${v.rate_per_km} ${v.accepted_currency}`,
        speedLimit: `${v.speed_limit_kmh} km/h`,
        speedPenalty: `${v.speed_penalty_usdc} USDC`,
        currency: v.accepted_currency,
        geofenceCenter: `${v.geofence_center_lat}, ${v.geofence_center_lng}`,
        geofenceRadius: `${v.geofence_radius_meters}m`
      })), null, 2);
    } catch (e) {
      vehiclesContext = 'Error fetching vehicle list context';
    }

    const formattedSystemPrompt = SYSTEM_PROMPT.replace('{VEHICLES_CONTEXT}', vehiclesContext);

    // 2. Resolve API Key
    const apiKey = customApiKey || process.env.DEEPSEEK_API_KEY;

    // Define tools for DeepSeek model
    const tools = [
      {
        type: 'function',
        function: {
          name: 'list_vehicles',
          description: 'Query and list vehicles available in the RentDrive database catalog.',
          parameters: {
            type: 'object',
            properties: {
              maxDeposit: { type: 'number', description: 'Filter vehicles by maximum security deposit required' },
              currency: { type: 'string', enum: ['USDC', 'EURC'], description: 'Filter vehicles by accepted currency' }
            },
            additionalProperties: false
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'check_balances',
          description: 'Assess the connected user wallet balances across chains for rental capability.',
          parameters: {
            type: 'object',
            properties: {
              walletAddress: { type: 'string', description: 'The user hex wallet address' }
            },
            required: ['walletAddress'],
            additionalProperties: false
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'prepare_swap',
          description: 'Prepare token swap parameters to convert USDC to EURC or vice versa on Arc Testnet.',
          parameters: {
            type: 'object',
            properties: {
              fromToken: { type: 'string', enum: ['USDC', 'EURC'], description: 'Source currency symbol' },
              toToken: { type: 'string', enum: ['USDC', 'EURC'], description: 'Target currency symbol' },
              amount: { type: 'string', description: 'Amount of source token to swap' }
            },
            required: ['fromToken', 'toToken', 'amount'],
            additionalProperties: false
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'prepare_bridge',
          description: 'Prepare CCTP bridge parameters to transfer USDC from Base/Ethereum Sepolia to Arc Testnet.',
          parameters: {
            type: 'object',
            properties: {
              sourceChain: { type: 'string', enum: ['EthereumSepolia', 'BaseSepolia', 'ArbitrumSepolia'], description: 'The source chain to bridge from' },
              amount: { type: 'string', description: 'Amount of USDC to bridge' }
            },
            required: ['sourceChain', 'amount'],
            additionalProperties: false
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'prepare_booking',
          description: 'Formulate booking smart contract parameters for locking deposit and starting a rental.',
          parameters: {
            type: 'object',
            properties: {
              vehicleId: { type: 'number', description: 'Database ID of the vehicle to rent' },
              walletAddress: { type: 'string', description: 'The renter wallet address' }
            },
            required: ['vehicleId', 'walletAddress'],
            additionalProperties: false
          }
        }
      }
    ];

    // If API Key is missing, run in Developer Simulation Mode
    if (!apiKey) {
      console.warn('[RentDrive AgentOS] DEEPSEEK_API_KEY is not configured. Running in Developer Simulation Mode.');
      const userMessage = messages[messages.length - 1].content.toLowerCase();
      
      let replyMessage = "I am running in Developer Simulation Mode because no DeepSeek API key was detected in env or UI settings. Please provide a key in the settings panel above to use real-time LLM reasoning!";
      let reasoning = "SYSTEM DIAGNOSTIC: DEEPSEEK_API_KEY missing. Parsing input keywords locally.";
      let toolCallResult: any = null;

      if (userMessage.includes('list') || userMessage.includes('car') || userMessage.includes('vehicle') || userMessage.includes('tesla') || userMessage.includes('ducati')) {
        reasoning += "\nUser requested vehicle listing. Simulating list_vehicles tool call.";
        const list = await db.getVehicles();
        let filtered = list;
        if (userMessage.includes('tesla')) {
          filtered = list.filter((v: any) => v.model.toLowerCase().includes('tesla'));
        } else if (userMessage.includes('ducati')) {
          filtered = list.filter((v: any) => v.model.toLowerCase().includes('ducati'));
        }
        
        toolCallResult = {
          name: 'list_vehicles',
          arguments: JSON.stringify({ currency: userMessage.includes('ducati') ? 'EURC' : 'USDC' }),
          output: filtered
        };
        replyMessage = `I found the following matching vehicles in the RentDrive database: ${filtered.map((v: any) => `${v.model} (${v.deposit_required} ${v.accepted_currency})`).join(', ')}. Would you like me to prepare the booking transactions?`;
      } else if (userMessage.includes('balance') || userMessage.includes('wallet') || userMessage.includes('money')) {
        reasoning += "\nUser requested balance evaluation. Simulating check_balances tool call.";
        toolCallResult = {
          name: 'check_balances',
          arguments: JSON.stringify({ walletAddress: userWallet || '0x' }),
          output: { walletAddress: userWallet || '0x', status: 'Requires connection to verify' }
        };
        replyMessage = `Checking wallet balances for ${userWallet || 'your connected address'}. Please ensure your wallet is connected in the top-right button to retrieve unified token holdings across chains.`;
      } else if (userMessage.includes('swap')) {
        reasoning += "\nUser requested stablecoin swap. Simulating prepare_swap tool call.";
        const match = userMessage.match(/(\d+)/);
        const amt = match ? match[1] : '10';
        const from = userMessage.includes('eurc') ? 'EURC' : 'USDC';
        const to = from === 'USDC' ? 'EURC' : 'USDC';
        
        toolCallResult = {
          name: 'prepare_swap',
          arguments: JSON.stringify({ fromToken: from, toToken: to, amount: amt }),
          output: { fromToken: from, toToken: to, amount: amt, rate: from === 'USDC' ? 0.92 : 1.08 }
        };
        replyMessage = `I have prepared the parameters to swap ${amt} ${from} to ${to} on Arc Testnet. You can view the checkout execution card below!`;
      } else if (userMessage.includes('bridge') || userMessage.includes('deposit')) {
        reasoning += "\nUser requested token bridging. Simulating prepare_bridge tool call.";
        const match = userMessage.match(/(\d+)/);
        const amt = match ? match[1] : '50';
        const chain = userMessage.includes('base') ? 'BaseSepolia' : 'EthereumSepolia';
        
        toolCallResult = {
          name: 'prepare_bridge',
          arguments: JSON.stringify({ sourceChain: chain, amount: amt }),
          output: { sourceChain: chain, targetChain: 'ArcTestnet', amount: amt }
        };
        replyMessage = `I compiled a CCTP bridge request to move ${amt} USDC from ${chain} to Arc Testnet. View the receipt card to authorize bridging.`;
      } else if (userMessage.includes('rent') || userMessage.includes('book') || userMessage.includes('lease')) {
        reasoning += "\nUser requested vehicle booking. Simulating prepare_booking tool call.";
        const list = await db.getVehicles();
        const vId = userMessage.includes('ducati') ? 2 : 1;
        const vehicle = list.find((v: any) => v.id === vId) || list[0];
        
        toolCallResult = {
          name: 'prepare_booking',
          arguments: JSON.stringify({ vehicleId: vId, walletAddress: userWallet }),
          output: { vehicle }
        };
        replyMessage = `I have formulated the smart contract transaction parameters for vehicle "${vehicle.model}". Please authorize the lock escrow and register odometer calls via the checkout card below.`;
      } else {
        replyMessage = "Hello! I am the RentDrive Autonomous Fleet Broker. Ask me to find vehicles, check your balances, swap tokens, bridge USDC, or lease cars on Arc Testnet!";
      }

      return NextResponse.json({
        success: true,
        message: replyMessage,
        reasoning: reasoning,
        toolCall: toolCallResult
      });
    }

    // 3. Connect to live DeepSeek API
    // Ensure to call the correct endpoints as specified by use-deepseek skill
    const apiMessages = [
      { role: 'system', content: formattedSystemPrompt },
      ...messages
    ];

    console.log('[RentDrive AgentOS] Calling DeepSeek completions endpoint...');
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-v4-pro',
        messages: apiMessages,
        tools: tools,
        thinking: { type: 'enabled' }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[RentDrive AgentOS] DeepSeek API returned error status:', response.status, errText);
      throw new Error(`DeepSeek API error: ${response.statusText} (${response.status}) - ${errText}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message;
    
    // Extract reasoning content (Chain of Thought) and content/tool calls
    const reasoning = assistantMessage.reasoning_content || 'DeepSeek completed reasoning internally.';
    const replyMessage = assistantMessage.content || 'I have prepared the requested tools for you.';
    let toolCallResult: any = null;

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const tc = assistantMessage.tool_calls[0];
      const name = tc.function.name;
      const args = JSON.parse(tc.function.arguments);
      
      let output: any = {};
      
      // Resolve tool call dynamically on the backend
      if (name === 'list_vehicles') {
        const list = await db.getVehicles();
        output = list.filter((v: any) => {
          if (args.maxDeposit && Number(v.deposit_required) > args.maxDeposit) return false;
          if (args.currency && v.accepted_currency !== args.currency) return false;
          return true;
        });
      } else if (name === 'check_balances') {
        output = { walletAddress: args.walletAddress, status: 'Querying unified balance...' };
      } else if (name === 'prepare_swap') {
        output = { fromToken: args.fromToken, toToken: args.toToken, amount: args.amount };
      } else if (name === 'prepare_bridge') {
        output = { sourceChain: args.sourceChain, amount: args.amount };
      } else if (name === 'prepare_booking') {
        const list = await db.getVehicles();
        output = { vehicle: list.find((v: any) => v.id === Number(args.vehicleId)) || list[0] };
      }

      toolCallResult = {
        name,
        arguments: tc.function.arguments,
        output
      };
    }

    return NextResponse.json({
      success: true,
      message: replyMessage,
      reasoning,
      toolCall: toolCallResult
    });

  } catch (error: any) {
    console.error('[RentDrive AgentOS] Exception in API route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
