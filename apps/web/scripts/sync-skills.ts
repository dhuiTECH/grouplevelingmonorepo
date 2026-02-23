
import { createClient } from '@supabase/supabase-js';
import { SKILL_DATA } from '../lib/skillTreeData';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncSkills() {
  console.log('Syncing skills to Supabase...');

  for (const [className, skills] of Object.entries(SKILL_DATA)) {
    if (!skills || skills.length === 0) continue;

    console.log(`Processing class: ${className}`);

    for (const skill of skills) {
      // Map SKILL_DATA fields to DB columns
      const dbSkill = {
        id: skill.id,
        name: skill.name,
        skill_type: skill.type === 'active' ? 'PHYSICAL' : 'PASSIVE', // Defaulting to PHYSICAL/PASSIVE based on type
        // Note: SKILL_DATA has 'active'/'passive', DB has 'PHYSICAL'/'MAGIC'/'PASSIVE'
        // I'll map 'active' to 'PHYSICAL' for now, or maybe check description for magic keywords? 
        // For Mage, I should probably use MAGIC.
        description_template: skill.getDescription(1).replace(/\d+/g, '{value}').replace(/(\d+)%/g, '{value}%'), 
        // The getDescription returns a string. I should probably just store a template.
        // Actually, the previous SKILL_DATA had getDescription as a function returning a string.
        // AdminSkillTreeBuilder uses description_template. 
        // I will use a simplified version of the description as the template.
        // Actually, let's just use the text from getDescription(1) but replace the number with a placeholder if possible, 
        // or just store the text as is for now since the builder allows editing.
        // Better yet, I'll use the description from getDescription(1) and let the user edit it later if needed.
        // Or I can try to reconstruct the template.
        // For now, I'll just use getDescription(1).
        
        x_pos: skill.x,
        y_pos: skill.y,
        max_rank: skill.maxRank,
        required_level: skill.requiredLevel,
        allowed_classes: [className],
        required_skill_id: skill.connectedTo ? skill.connectedTo[0] : null,
        
        // Default values for fields not in SKILL_DATA
        base_value: 0, 
        energy_cost: 0,
        cooldown_ms: (skill.cooldown || 0) * 1000,
        scaling_factor: 1.0,
        icon_path: 'zap' // Default icon
      };

      // Adjust skill_type for Mage
      if (className === 'Mage' || className === 'Healer') {
          if (dbSkill.skill_type === 'PHYSICAL') dbSkill.skill_type = 'MAGIC';
      }

      // Special handling for description template
      // The SKILL_DATA getDescription function takes a rank.
      // I'll define description_template as the string returned by getDescription(0) but replacing '0' with '{val}'? 
      // No, that's unsafe.
      // I'll just save the text for rank 1 and let it be static for now, or try to guess.
      // The admin tool expects description_template.
      dbSkill.description_template = skill.getDescription(1); // Use rank 1 description as base

      const { error } = await supabase
        .from('skills')
        .upsert(dbSkill, { onConflict: 'id' });

      if (error) {
        console.error(`Error upserting skill ${skill.id}:`, error);
      } else {
        console.log(`Synced skill: ${skill.name}`);
      }
    }
  }

  console.log('Skill sync complete!');
}

syncSkills().catch(console.error);
