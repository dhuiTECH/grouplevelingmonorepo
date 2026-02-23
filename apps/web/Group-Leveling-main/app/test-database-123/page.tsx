"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestDatabasePage() {
  const [status, setStatus] = useState<string>('Ready to test');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setStatus('Testing connection...');
    setResults(null);

    try {
      // Test 1: Check if client-side client is initialized
      const clientStatus = {
        supabase: supabase ? '✅ Initialized' : '❌ Not initialized',
        supabaseAdmin: '⚠️ Server-only (cannot check from client)',
        note: 'supabaseAdmin is intentionally null on client for security'
      };

      // Test 2: Try a simple query via API (server-side)
      let queryResult = null;
      let queryError = null;

      try {
        const queryResponse = await fetch('/api/test-db-query');
        if (queryResponse.ok) {
          const queryData = await queryResponse.json();
          queryResult = queryData.data;
          queryError = queryData.error || null;
        } else {
          queryError = 'Failed to query database';
        }
      } catch (err: any) {
        queryError = err.message;
      }

      // Test 3: Check environment variables (without exposing secrets)
      // Note: Client-side code can't access server-side env vars (those without NEXT_PUBLIC_)
      // So we need to check via an API call
      let envCheck = {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceKey: false, // Can't check server-side vars from client
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...' || 'Not set',
      };

      // Check server-side env vars via API
      try {
        const envResponse = await fetch('/api/test-env');
        if (envResponse.ok) {
          const envData = await envResponse.json();
          envCheck = { ...envCheck, ...envData };
        }
      } catch (err) {
        console.log('Could not check server env vars:', err);
      }

      setResults({
        clients: clientStatus,
        query: {
          success: !queryError,
          error: queryError,
          data: queryResult,
        },
        environment: envCheck,
      });

      if (queryError && queryError.includes('relation "test_table" does not exist')) {
        setStatus('⚠️ Connection works, but test_table does not exist. Run the SQL script first!');
      } else if (queryError) {
        setStatus(`❌ Query failed: ${queryError}`);
      } else {
        setStatus('✅ Connection successful!');
      }
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testInsert = async () => {
    setLoading(true);
    setStatus('Testing insert...');

    try {
      const response = await fetch('/api/test-db-insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Test message at ${new Date().toISOString()}`,
          test_number: Math.floor(Math.random() * 1000)
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setStatus(`❌ Insert failed: ${data.error || 'Unknown error'}`);
        setResults({ insertError: data.error });
      } else {
        setStatus('✅ Insert successful!');
        setResults({ insertData: data.data });
      }
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testSelect = async () => {
    setLoading(true);
    setStatus('Testing select...');

    try {
      const response = await fetch('/api/test-db-select');
      const data = await response.json();

      if (!response.ok || data.error) {
        setStatus(`❌ Select failed: ${data.error || 'Unknown error'}`);
        setResults({ selectError: data.error });
      } else {
        setStatus(`✅ Select successful! Found ${data.data?.length || 0} records`);
        setResults({ selectData: data.data });
      }
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-400 p-8 font-mono">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black mb-2 text-green-500">Database Connection Test</h1>
        <p className="text-sm text-gray-500 mb-8">Test your Supabase database connectivity</p>

        <div className="space-y-4 mb-8">
          <button
            onClick={testConnection}
            disabled={loading}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white rounded-lg font-bold"
          >
            Test Connection
          </button>

          <button
            onClick={testInsert}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg font-bold ml-4"
          >
            Test Insert
          </button>

          <button
            onClick={testSelect}
            disabled={loading}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white rounded-lg font-bold ml-4"
          >
            Test Select
          </button>
        </div>

        <div className="bg-gray-900 border border-green-500/30 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-green-400">Status:</h2>
          <p className="text-sm mb-6">{status}</p>

          {results && (
            <div>
              <h3 className="text-lg font-bold mb-3 text-green-400">Results:</h3>
              <pre className="bg-black p-4 rounded text-xs overflow-auto max-h-96 border border-gray-800">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-8 bg-gray-900 border border-blue-500/30 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-blue-400">Instructions:</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
            <li>Run the SQL script in Supabase SQL Editor to create the test table</li>
            <li>Click "Test Connection" to verify your setup</li>
            <li>Click "Test Insert" to add a test record</li>
            <li>Click "Test Select" to retrieve records</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

