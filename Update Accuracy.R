library(jsonlite)

results <- fromJSON("All Results.json", simplifyVector = FALSE)

totalCorrectLines <- 0
totalLines <- 0

for(x in 2:length(results))
{
  for(y in 1:length(results[[x]]$games))
  {
    totalCorrectLines <- results[[x]]$games[[y]]$correctLines + totalCorrectLines
    totalLines <- results[[x]]$games[[y]]$totalLines + totalLines
  }
}

results[[1]]$totalCorrectLines <- totalCorrectLines
results[[1]]$totalLines <- totalLines
results[[1]]$accuracy <- paste0(round(100*(totalCorrectLines/totalLines), digits = 2), "%")
write_json(results, "All Results.json", pretty = TRUE, auto_unbox = TRUE)
