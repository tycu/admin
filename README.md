Deploy: (rsync to delete unused, cp to update with gzipped versions where appropriate)

`gsutil -m rsync -d -r _site gs://admin.tally.us/`
