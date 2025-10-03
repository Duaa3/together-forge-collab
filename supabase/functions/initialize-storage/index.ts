import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Initializing storage bucket...');

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Step 1: Check if bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      throw listError;
    }

    const bucketExists = buckets?.some(b => b.name === 'test-cvs');
    console.log('Bucket exists:', bucketExists);

    // Step 2: Create bucket if it doesn't exist
    if (!bucketExists) {
      console.log('Creating test-cvs bucket...');
      const { data: newBucket, error: createError } = await supabaseAdmin.storage.createBucket('test-cvs', {
        public: false,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['application/pdf']
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
        throw createError;
      }

      console.log('Bucket created successfully:', newBucket);
    } else {
      console.log('Bucket already exists, skipping creation');
    }

    // Step 3: Set up RLS policies via SQL
    console.log('Setting up RLS policies...');
    
    const policySQL = `
      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Authenticated users can upload test CVs" ON storage.objects;
      DROP POLICY IF EXISTS "Authenticated users can read test CVs" ON storage.objects;
      DROP POLICY IF EXISTS "Authenticated users can update test CVs" ON storage.objects;
      DROP POLICY IF EXISTS "Authenticated users can delete test CVs" ON storage.objects;

      -- Create policies for test-cvs bucket
      CREATE POLICY "Authenticated users can upload test CVs"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'test-cvs');

      CREATE POLICY "Authenticated users can read test CVs"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (bucket_id = 'test-cvs');

      CREATE POLICY "Authenticated users can update test CVs"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (bucket_id = 'test-cvs');

      CREATE POLICY "Authenticated users can delete test CVs"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'test-cvs');
    `;

    // Note: RLS policies should be set up via migration, not via RPC
    // This is just for verification
    console.log('Note: RLS policies should be configured via database migration');

    // Step 4: Test storage access
    console.log('Testing storage access...');
    const testFileName = 'test-init.txt';
    const testContent = 'Storage initialization test';
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from('test-cvs')
      .upload(testFileName, testContent, {
        contentType: 'text/plain',
        upsert: true
      });

    if (uploadError) {
      console.error('Error testing upload:', uploadError);
      throw uploadError;
    }

    // Clean up test file
    await supabaseAdmin.storage.from('test-cvs').remove([testFileName]);

    console.log('Storage initialization completed successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Storage bucket initialized successfully',
        bucket: 'test-cvs',
        bucketExists
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Storage initialization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: error
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
