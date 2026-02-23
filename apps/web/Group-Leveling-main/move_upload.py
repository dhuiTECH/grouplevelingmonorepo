
import os

file_path = 'app/admin/page.tsx'

with open(file_path, 'r') as f:
    lines = f.readlines()

# Lines are 0-indexed in python, 1-indexed in editor
# Start line 4698 -> index 4697
# End line 4802 -> index 4801 (inclusive of the line itself)
start_idx = 4697
end_idx = 4801 

# Extract the block
# lines[start_idx : end_idx + 1] captures the block
block_lines = lines[start_idx : end_idx + 1]
block_content = "".join(block_lines)

# Verify the block starts with <div> and ends with </div>
print(f"Block starts with: {block_lines[0].strip()}")
print(f"Block ends with: {block_lines[-1].strip()}")

# Remove the block from the original lines
# We need to be careful with indices. 
# We remove lines[start_idx : end_idx + 1]
remaining_lines = lines[:start_idx] + lines[end_idx + 1:]

# Find the insertion point
# Look for <CustomDropdown label="Slot (Equipment/Visual) *"
insertion_idx = -1
for i, line in enumerate(remaining_lines):
    if 'label="Slot (Equipment/Visual) *"' in line:
        # The CustomDropdown component starts a few lines before usually, checking the file...
        # In the read_file output:
        # 4446|          <CustomDropdown
        # 4447|              label="Slot (Equipment/Visual) *"
        # So we should look for the line BEFORE line 4447 which contains <CustomDropdown
        # Or just insert before the CustomDropdown start.
        
        # Let's look for the line containing <CustomDropdown that is immediately followed (or close) to the label.
        # Based on previous read:
        # 4446|          <CustomDropdown
        # 4447|              label="Slot (Equipment/Visual) *"
        
        # So if we find line with label="Slot...", we should go back 1 line to find <CustomDropdown
        # But we need to be robust.
        pass

# Let's search for the specific unique string for the slot dropdown
target_label = 'label="Slot (Equipment/Visual) *"'
target_line_idx = -1

for i, line in enumerate(remaining_lines):
    if target_label in line:
        target_line_idx = i
        break

if target_line_idx != -1:
    # We found the label line. The <CustomDropdown start is likely 1 line before.
    # Let's check 1 line before
    if '<CustomDropdown' in remaining_lines[target_line_idx - 1]:
        insertion_point = target_line_idx - 1
    else:
        # Maybe it's on the same line?
        if '<CustomDropdown' in remaining_lines[target_line_idx]:
             insertion_point = target_line_idx
        else:
            # Fallback: just insert before the label line, though that might be inside the component props
            # If the component structure is:
            # <CustomDropdown
            #   label="..."
            # Inserting before label="..." breaks the component.
            # We MUST find the start of the component.
            print("Warning: Could not strictly identify <CustomDropdown start. Listing context:")
            print("".join(remaining_lines[target_line_idx-2:target_line_idx+1]))
            insertion_point = target_line_idx - 1 # Assumption based on file format
            
    # Insert the block
    # We might want to add a newline for spacing
    final_lines = remaining_lines[:insertion_point] + block_lines + ['\n'] + remaining_lines[insertion_point:]
    
    with open(file_path, 'w') as f:
        f.writelines(final_lines)
    print("Successfully moved the block.")

else:
    print("Could not find insertion point.")

