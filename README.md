Deploy: (rsync to delete unused, cp to update with gzipped versions where appropriate)

`gsutil -m rsync -d -r _site gs://admin.tally.us/; gsutil cp -z js,css,html -r _site gs://admin.tally.us`
