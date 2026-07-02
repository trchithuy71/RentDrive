'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { Address } from 'viem';
import { Cpu, ShieldAlert, Plus, ShieldCheck, Activity, Trash2, ShieldX, RefreshCw } from 'lucide-react';
import { useModal, TransactionStep } from '@/contexts/ModalContext';
import { useGaslessWriteContract } from '@/hooks/useGaslessWriteContract';
import { useCircleApp } from '@/contexts/CircleAppContext';

interface OracleAgent {
  address: string;
  weight: number;
  reputation: number;
  reports: number;
  slashes: number;
  active: boolean;
  tokenId?: number;
  metadata?: {
    name?: string;
    description?: string;
    version?: string;
    capabilities?: string[];
    endpoints?: {
      mcp?: string;
      api?: string;
    };
  };
}

export default function OracleRegistryManager() {
  const { isConnected, address } = useAccount();
  const [oracles, setOracles] = useState<OracleAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Form states for registering a new AI Agent Oracle
  const [oracleAddress, setOracleAddress] = useState('');
  const [agentName, setAgentName] = useState('');
  const [agentDesc, setAgentDesc] = useState('');
  const [agentVersion, setAgentVersion] = useState('1.0.0');
  const [agentCapabilities, setAgentCapabilities] = useState('telemetry_validation, crash_sensor_readings');
  const [agentMcp, setAgentMcp] = useState('https://agent.rentdrive.io/mcp');

  // Form states for adding validation weight
  const [addAddress, setAddAddress] = useState('');
  const [addWeight, setAddWeight] = useState('1');

  const { showModal, updateModal } = useModal();
  const { gaslessEnabled } = useCircleApp();
  const { writeContractAsync } = useGaslessWriteContract();
  const publicClient = usePublicClient();

  const registryAddress = process.env.NEXT_PUBLIC_ORACLE_REGISTRY_ADDRESS as Address;
  const oracleRegistryArtifact = require('../contracts/OracleRegistry.json');

  useEffect(() => {
    fetchOracles();
  }, [isConnected, registryAddress]);

  const fetchOracles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/oracle');
      const data = await res.json();
      if (data.success && data.oracles) {
        // Now query on-chain NFT metadata details if possible
        const fetchedOracles = [...data.oracles];
        
        if (registryAddress && publicClient && fetchedOracles.length > 0) {
          await Promise.all(
            fetchedOracles.map(async (oracle: any) => {
              try {
                // Get NFT Token ID
                const tokenId = await publicClient.readContract({
                  address: registryAddress,
                  abi: oracleRegistryArtifact.abi,
                  functionName: 'agentTokenIds',
                  args: [oracle.address as Address],
                }) as bigint;

                oracle.tokenId = Number(tokenId);

                if (tokenId > BigInt(0)) {
                  // Fetch ERC-721 tokenURI
                  const tokenUri = await publicClient.readContract({
                    address: registryAddress,
                    abi: oracleRegistryArtifact.abi,
                    functionName: 'tokenURI',
                    args: [tokenId],
                  }) as string;

                  if (tokenUri && tokenUri.startsWith('data:application/json;base64,')) {
                    const base64Str = tokenUri.split('base64,')[1];
                    const decoded = JSON.parse(atob(base64Str));
                    oracle.metadata = decoded;
                  }
                }
              } catch (e) {
                console.error(`Failed to load on-chain NFT info for oracle ${oracle.address}:`, e);
              }
            })
          );
        }
        
        setOracles(fetchedOracles);
      }
    } catch (error) {
      console.error('Failed to load oracles from registry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oracleAddress || !agentName) return;

    setRegistering(true);

    const steps: TransactionStep[] = [
      { label: 'MINT ERC-8004 IDENTITY NFT', status: 'pending' },
      { label: 'REGISTER NODE IN OPERATOR SET', status: 'idle' },
    ];

    showModal({
      type: 'transaction',
      title: 'REGISTERING AI AGENT ORACLE',
      message: `Minting ERC-8004 Identity NFT for AI Oracle Node...`,
      txSteps: steps,
      preventClose: true,
    });

    try {
      const isContractActive = !!registryAddress && registryAddress.startsWith('0x');

      // 1. Build Metadata Card JSON & base64 URI
      const metadata = {
        name: agentName,
        description: agentDesc || `ERC-8004 registered AI validation agent`,
        version: agentVersion,
        capabilities: agentCapabilities.split(',').map(c => c.trim()),
        endpoints: {
          mcp: agentMcp,
          api: agentMcp.replace('/mcp', '/api')
        }
      };
      const metadataUri = `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;

      if (isContractActive) {
        // Mint NFT identity Card
        console.log('Minting ERC-8004 agent card on-chain...');
        const txHash = await writeContractAsync({
          address: registryAddress,
          abi: oracleRegistryArtifact.abi,
          functionName: 'registerAgent',
          args: [oracleAddress as Address, metadataUri],
        }, { txName: 'Register Agent NFT' });

        updateModal({ txHash });
        await publicClient?.waitForTransactionReceipt({ hash: txHash });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      steps[0].status = 'success';
      steps[1].status = 'pending';
      updateModal({ txSteps: [...steps] });

      // 2. Add to Local DB/Registry via API
      const res = await fetch('/api/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          address: oracleAddress,
          metadataUri,
        }),
      });

      const data = await res.json();
      if (data.success) {
        steps[1].status = 'success';
        updateModal({
          type: 'success',
          title: 'AI ORACLE AGENT REGISTERED',
          message: `ERC-8004 AI Agent Identity NFT successfully minted for ${agentName}.`,
          txSteps: [...steps],
          preventClose: false,
          primaryAction: {
            label: 'DISMISS',
            onClick: () => {
              setOracleAddress('');
              setAgentName('');
              setAgentDesc('');
              fetchOracles();
            },
          },
        });
      } else {
        throw new Error(data.error || 'Failed to complete registration');
      }
    } catch (err: any) {
      console.error('Oracle registration failed:', err);
      showModal({
        type: 'error',
        title: 'REGISTRATION FAILED',
        message: err.message || err.toString(),
        primaryAction: { label: 'DISMISS', onClick: () => {} },
      });
    } finally {
      setRegistering(false);
    }
  };

  const handleAddOracle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addAddress) return;

    setSubmittingAction(true);
    showModal({
      type: 'loading',
      title: 'ADDING ACTIVE ORACLE NODE',
      message: `Adding address to validation consensus with weight ${addWeight}...`,
      preventClose: true,
    });

    try {
      const isContractActive = !!registryAddress && registryAddress.startsWith('0x');

      if (isContractActive) {
        const txHash = await writeContractAsync({
          address: registryAddress,
          abi: oracleRegistryArtifact.abi,
          functionName: 'addOracle',
          args: [addAddress as Address, BigInt(addWeight)],
        }, { txName: 'Add Oracle Node' });

        await publicClient?.waitForTransactionReceipt({ hash: txHash });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }

      const res = await fetch('/api/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          address: addAddress,
          weight: Number(addWeight),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showModal({
          type: 'success',
          title: 'ORACLE NODE ACTIVATED',
          message: `Oracle ${addAddress} is now an active telemetry consensus reporter.`,
          primaryAction: {
            label: 'DISMISS',
            onClick: () => {
              setAddAddress('');
              fetchOracles();
            },
          },
        });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error(err);
      showModal({
        type: 'error',
        title: 'ACTIVATION FAILED',
        message: err.message || err.toString(),
        primaryAction: { label: 'DISMISS', onClick: () => {} },
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRemoveOracle = async (addr: string) => {
    showModal({
      type: 'confirm',
      title: 'DEACTIVATE ORACLE NODE',
      message: `Are you sure you want to deactivate oracle ${addr}? This will remove them from consensus voting.`,
      primaryAction: {
        label: 'DEACTIVATE',
        onClick: async () => {
          showModal({ type: 'loading', title: 'DEACTIVATING NODE', message: 'Removing oracle node from consensus...', preventClose: true });
          try {
            const isContractActive = !!registryAddress && registryAddress.startsWith('0x');

            if (isContractActive) {
              const txHash = await writeContractAsync({
                address: registryAddress,
                abi: oracleRegistryArtifact.abi,
                functionName: 'removeOracle',
                args: [addr as Address],
              }, { txName: 'Remove Oracle Node' });
              await publicClient?.waitForTransactionReceipt({ hash: txHash });
            } else {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }

            const res = await fetch('/api/oracle', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'remove',
                address: addr,
              }),
            });
            const data = await res.json();
            if (data.success) {
              showModal({
                type: 'success',
                title: 'ORACLE DEACTIVATED',
                message: 'Node successfully removed from validation list.',
                primaryAction: { label: 'DISMISS', onClick: () => { fetchOracles(); } }
              });
            } else {
              throw new Error(data.error);
            }
          } catch (err: any) {
            showModal({ type: 'error', title: 'DEACTIVATION FAILED', message: err.message || err.toString() });
          }
        }
      },
      secondaryAction: { label: 'CANCEL', onClick: () => {} }
    });
  };

  // Metrics summary
  const totalOracles = oracles.length;
  const activeOracles = oracles.filter(o => o.active).length;
  const averageReputation = totalOracles > 0
    ? Math.round(oracles.reduce((sum, o) => sum + o.reputation, 0) / totalOracles)
    : 100;
  const totalSlashes = oracles.reduce((sum, o) => sum + o.slashes, 0);

  return (
    <div className="space-y-10">
      
      {/* Metrics Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-sm border border-[#E0DDD5] bg-white p-5">
          <span className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">Consensus Threshold</span>
          <div className="flex justify-between items-baseline">
            <span className="text-xl font-black text-[#1C2B3C] font-mono">2-OF-3</span>
            <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-sm font-bold">M-of-N ACTIVE</span>
          </div>
        </div>
        <div className="rounded-sm border border-[#E0DDD5] bg-white p-5">
          <span className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">Registered Agents</span>
          <div className="flex justify-between items-baseline">
            <span className="text-xl font-black text-[#1C2B3C] font-mono">{totalOracles} Nodes</span>
            <span className="text-[9px] text-[#718096] font-bold uppercase tracking-widest">{activeOracles} ACTIVE</span>
          </div>
        </div>
        <div className="rounded-sm border border-[#E0DDD5] bg-white p-5">
          <span className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">Network Reputation</span>
          <div className="flex justify-between items-baseline">
            <span className="text-xl font-black text-[#1C2B3C] font-mono">{averageReputation}%</span>
            <span className="text-[9px] text-emerald-600 font-bold uppercase">HIGH ACCURACY</span>
          </div>
        </div>
        <div className="rounded-sm border border-[#E0DDD5] bg-white p-5">
          <span className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">Total Slashing Events</span>
          <div className="flex justify-between items-baseline">
            <span className="text-xl font-black text-[#1C2B3C] font-mono">{totalSlashes} Slashes</span>
            {totalSlashes > 0 ? (
              <span className="text-[9px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-sm font-bold">PENALTIES APPLIED</span>
            ) : (
              <span className="text-[9px] text-[#718096] font-semibold uppercase">SECURE NETWORK</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Node Registry list */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="flex justify-between items-center pb-2 border-b border-[#E0DDD5]">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#1C2B3C] flex items-center gap-2">
              <Cpu className="h-4.5 w-4.5 text-[#1C2B3C]" />
              ERC-8004 AI Agent Registry Nodes
            </h3>
            <button
              onClick={fetchOracles}
              className="flex items-center gap-1 text-[9px] text-[#718096] font-extrabold uppercase tracking-wider hover:text-[#1C2B3C] transition-all"
            >
              <RefreshCw className="h-3 w-3" />
              REFRESH
            </button>
          </div>

          {loading ? (
            <div className="rounded-sm border border-dashed border-[#DDDCD4] bg-white p-16 text-center text-[#718096] text-xs font-semibold">
              Loading AI Oracle registry information...
            </div>
          ) : oracles.length === 0 ? (
            <div className="rounded-sm border border-dashed border-[#DDDCD4] bg-[#EAE8E1]/30 p-16 text-center text-[#718096] text-xs font-semibold">
              No oracle agent nodes registered. Use the panel on the right to register node metadata and authorize validation weights.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {oracles.map((oracle) => {
                const isSlashed = oracle.reputation < 80;
                return (
                  <div key={oracle.address} className="rounded-sm border border-[#E0DDD5] bg-white p-6 relative flex flex-col justify-between">
                    
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5">
                      {oracle.active ? (
                        <span className="flex items-center gap-1 rounded-sm bg-emerald-50 border border-emerald-300 text-emerald-700 font-mono font-bold text-[8.5px] uppercase tracking-wider px-2 py-0.5">
                          <ShieldCheck className="h-3 w-3 fill-current" />
                          ACTIVE
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-sm bg-gray-50 border border-gray-300 text-gray-700 font-mono font-bold text-[8.5px] uppercase tracking-wider px-2 py-0.5">
                          <ShieldX className="h-3 w-3" />
                          INACTIVE
                        </span>
                      )}
                    </div>

                    {/* Agent Identification */}
                    <div>
                      <h4 className="font-bold text-[#1C2B3C] text-sm uppercase tracking-wide mb-1">
                        {oracle.metadata?.name || 'AI TELEMETRY NODE'}
                      </h4>
                      <span className="block text-[8px] font-mono text-[#718096] truncate mb-3">
                        ADDR: {oracle.address}
                      </span>

                      {/* ERC-8004 NFT Card Details */}
                      {oracle.tokenId ? (
                        <div className="mb-4 text-[10px] text-[#2c3d4f] bg-[#f0f4f8] border border-[#d0dfed] px-2.5 py-1.5 rounded-sm">
                          <div className="font-extrabold uppercase tracking-widest text-[#1a2b3c] flex items-center gap-1">
                            🤖 ERC-8004 IDENTITY NFT CARD #{oracle.tokenId}
                          </div>
                          <div className="mt-1 font-mono text-[9px] text-[#55697d]">
                            Version: {oracle.metadata?.version || '1.0.0'} · MCP: {oracle.metadata?.endpoints?.mcp || 'N/A'}
                          </div>
                          <div className="mt-1.5 text-[8.5px] text-[#4d5d6d] font-semibold">
                            Capabilities: {oracle.metadata?.capabilities?.join(', ') || 'telemetry validation'}
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4 text-[9px] text-[#718096] bg-[#f8f9fa] border border-[#e2e8f0] px-2.5 py-1 rounded-sm">
                          Identity Verification pending...
                        </div>
                      )}

                      {/* Validation Stats */}
                      <div className="grid grid-cols-3 gap-3 text-xs border-t border-[#F2F1EC] pt-4 mb-5">
                        <div>
                          <span className="block text-[#718096] font-bold text-[8px] tracking-wider uppercase mb-0.5">Weight</span>
                          <span className="text-[#1C2B3C] font-black">{oracle.weight}</span>
                        </div>
                        <div>
                          <span className="block text-[#718096] font-bold text-[8px] tracking-wider uppercase mb-0.5">Reports</span>
                          <span className="text-[#1C2B3C] font-black">{oracle.reports}</span>
                        </div>
                        <div>
                          <span className="block text-[#718096] font-bold text-[8px] tracking-wider uppercase mb-0.5">Reputation</span>
                          <span className={`font-black ${isSlashed ? 'text-red-600' : 'text-[#1C2B3C]'}`}>
                            {oracle.reputation}/100
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Node Actions */}
                    <div className="flex gap-2.5">
                      {oracle.active ? (
                        <button
                          onClick={() => handleRemoveOracle(oracle.address)}
                          className="flex-1 py-2 rounded-sm bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 transition-all font-bold text-[9px] tracking-widest uppercase flex items-center justify-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            setAddAddress(oracle.address);
                            setAddWeight('1');
                          }}
                          className="flex-1 py-2 rounded-sm bg-[#1C2B3C] hover:bg-[#111A24] text-white transition-all font-bold text-[9px] tracking-widest uppercase"
                        >
                          Activate Consensual Vote
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Right Columns: Admin Forms */}
        <div className="space-y-8">
          
          {/* Register AI Agent Identity (ERC-8004 NFT Card) */}
          <div className="rounded-sm border border-[#E0DDD5] bg-white p-6 h-fit shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#1C2B3C] mb-5 flex items-center gap-2 pb-2 border-b border-[#F2F1EC]">
              <Plus className="h-4 w-4 text-[#1C2B3C]" />
              Mint Agent Identity
            </h3>

            <form onSubmit={handleRegisterAgent} className="space-y-4">
              <div>
                <label className="block text-[8.5px] text-[#718096] font-bold uppercase tracking-widest mb-1">NODE WALLET ADDRESS</label>
                <input
                  type="text"
                  required
                  value={oracleAddress}
                  onChange={(e) => setOracleAddress(e.target.value)}
                  placeholder="e.g. 0x71C...3A9 (EVM Address)"
                  className="w-full rounded-sm border border-[#DDDCD4] bg-white px-3.5 py-2 text-xs text-[#1C2B3C] font-mono focus:border-[#1C2B3C] focus:outline-none form-focus-ring"
                />
                <span className="text-[9px] text-[#718096] font-semibold mt-1 block">💡 The hardware device's automated blockchain account address.</span>
              </div>
              
              <div>
                <label className="block text-[8.5px] text-[#718096] font-bold uppercase tracking-widest mb-1">AGENT NODE NAME</label>
                <input
                  type="text"
                  required
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="e.g. Hanoi Telematics Node 1"
                  className="w-full rounded-sm border border-[#DDDCD4] bg-white px-3.5 py-2 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none form-focus-ring"
                />
                <span className="text-[9px] text-[#718096] font-semibold mt-1 block">💡 A friendly name used to identify this oracle node on-chain.</span>
              </div>

              <div>
                <label className="block text-[8.5px] text-[#718096] font-bold uppercase tracking-widest mb-1">DESCRIPTION</label>
                <input
                  type="text"
                  value={agentDesc}
                  onChange={(e) => setAgentDesc(e.target.value)}
                  placeholder="e.g. Hanoi IoT telemetry validator node"
                  className="w-full rounded-sm border border-[#DDDCD4] bg-white px-3.5 py-2 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none form-focus-ring"
                />
                <span className="text-[9px] text-[#718096] font-semibold mt-1 block">💡 What physical region or subset of vehicles this node validates.</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8.5px] text-[#718096] font-bold uppercase tracking-widest mb-1">AGENT VERSION</label>
                  <input
                    type="text"
                    required
                    value={agentVersion}
                    onChange={(e) => setAgentVersion(e.target.value)}
                    placeholder="e.g. 1.0.0"
                    className="w-full rounded-sm border border-[#DDDCD4] bg-white px-3.5 py-2 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none form-focus-ring"
                  />
                  <span className="text-[9px] text-[#718096] font-semibold mt-1 block">💡 Node daemon version.</span>
                </div>
                <div>
                  <label className="block text-[8.5px] text-[#718096] font-bold uppercase tracking-widest mb-1">CAPABILITIES</label>
                  <input
                    type="text"
                    required
                    value={agentCapabilities}
                    onChange={(e) => setAgentCapabilities(e.target.value)}
                    placeholder="e.g. telemetry_validation, crash_sensor_readings"
                    className="w-full rounded-sm border border-[#DDDCD4] bg-white px-3.5 py-2 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none form-focus-ring"
                  />
                  <span className="text-[9px] text-[#718096] font-semibold mt-1 block">💡 Comma-separated list of validation triggers.</span>
                </div>
              </div>

              <div>
                <label className="block text-[8.5px] text-[#718096] font-bold uppercase tracking-widest mb-1">AGENT MCP ENDPOINT</label>
                <input
                  type="text"
                  required
                  value={agentMcp}
                  onChange={(e) => setAgentMcp(e.target.value)}
                  placeholder="e.g. https://agent.rentdrive.io/mcp"
                  className="w-full rounded-sm border border-[#DDDCD4] bg-white px-3.5 py-2 text-xs text-[#1C2B3C] font-mono focus:border-[#1C2B3C] focus:outline-none form-focus-ring"
                />
                <span className="text-[9px] text-[#718096] font-semibold mt-1 block">💡 The Model Context Protocol URL used by AI Agent OS.</span>
              </div>

              <button
                type="submit"
                disabled={registering}
                className="w-full mt-2 py-3 bg-[#1C2B3C] hover:bg-[#111A24] text-white text-[10px] font-bold tracking-widest uppercase rounded-sm border border-[#1C2B3C] transition-all flex items-center justify-center gap-1.5"
              >
                {gaslessEnabled && <Activity className="h-3.5 w-3.5 animate-pulse text-emerald-400" />}
                {registering ? 'MINTING AGENT NFT...' : 'MINT IDENTITY NFT (ERC-8004)'}
              </button>
            </form>
          </div>

          {/* Add active Consensus Member */}
          <div className="rounded-sm border border-[#E0DDD5] bg-white p-6 h-fit shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#1C2B3C] mb-5 flex items-center gap-2 pb-2 border-b border-[#F2F1EC]">
              <ShieldCheck className="h-4 w-4 text-[#1C2B3C]" />
              Activate Consensual Node
            </h3>

            <form onSubmit={handleAddOracle} className="space-y-4">
              <div>
                <label className="block text-[8.5px] text-[#718096] font-bold uppercase tracking-widest mb-1">AGENT WALLET ADDRESS</label>
                <input
                  type="text"
                  required
                  value={addAddress}
                  onChange={(e) => setAddAddress(e.target.value)}
                  placeholder="e.g. 0x71C...3A9 (EVM Address)"
                  className="w-full rounded-sm border border-[#DDDCD4] bg-white px-3.5 py-2 text-xs text-[#1C2B3C] font-mono focus:border-[#1C2B3C] focus:outline-none form-focus-ring"
                />
                <span className="text-[9px] text-[#718096] font-semibold mt-1 block">💡 Address of the registered node to grant voting rights.</span>
              </div>
              
              <div>
                <label className="block text-[8.5px] text-[#718096] font-bold uppercase tracking-widest mb-1">VOTING WEIGHT</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={10}
                  value={addWeight}
                  onChange={(e) => setAddWeight(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full rounded-sm border border-[#DDDCD4] bg-white px-3.5 py-2 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none form-focus-ring"
                />
                <span className="text-[9px] text-[#718096] font-semibold mt-1 block">💡 Consensus vote weight (between 1 and 10 shares).</span>
              </div>

              <button
                type="submit"
                disabled={submittingAction}
                className="w-full mt-2 py-3 bg-[#1C2B3C] hover:bg-[#111A24] text-white text-[10px] font-bold tracking-widest uppercase rounded-sm border border-[#1C2B3C] transition-all"
              >
                {submittingAction ? 'COMMITTING NODE...' : 'ADD NODE TO CONSENSUS'}
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
