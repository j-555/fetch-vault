# CSV Import Feature

The CSV import feature allows you to bulk import entries into your vault from a CSV file.

## CSV File Format

The CSV file should have the following required columns:

- `account`: The account name or username
- `password`: The account password

Optional columns:
- `parent_folder`: The folder path where the item should be stored
- `tags`: Comma-separated list of tags to apply to the item
- `item_type`: The type of item (defaults to 'password')

### Example CSV Structure

```csv
account,password,parent_folder,tags,item_type
johndoe@example.com,secretpass123,Passwords,work secure,password
janedoe@gmail.com,pass456,Email,personal,password
```

## Notes

1. Parent folders will be created automatically if they don't exist
2. You can specify nested folders using forward slashes (e.g., "Email/Personal")
3. Tags should be space-separated in the CSV
4. The `item_type` field defaults to 'password' if not specified

## Security Considerations

1. The vault must be unlocked to import items
2. All imported items are encrypted using your vault's master key
3. The CSV file is processed locally and is not sent to any external servers
4. After importing, securely delete the CSV file as it contains sensitive data

## How to Use

1. Go to Settings > Vault Management
2. Click the "Import" button
3. Select your CSV file when prompted
4. The items will be imported and encrypted automatically

A sample CSV file is provided at `sample_import.csv` for reference. 