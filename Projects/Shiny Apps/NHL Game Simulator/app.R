library(shiny)
library(httr)
library(jsonlite)
library(dplyr)

# ============================================================
# API Helper
# ============================================================

getAPI <- function(url)
{
  response <- GET(url)
  raw_json <- content(response, "text", encoding = "UTF-8")
  fromJSON(raw_json)
}

# ============================================================
# General Helpers
# ============================================================

getDefault <- function(df, field, i)
{
  if(field %in% names(df) && is.data.frame(df[[field]]) && "default" %in% names(df[[field]]))
  {
    return(df[[field]]$default[i])
  }
  
  flatName <- paste0(field, ".default")
  
  if(flatName %in% names(df))
  {
    return(df[[flatName]][i])
  }
  
  return(NA)
}

playerNamesFromDF <- function(df)
{
  if(is.null(df) || nrow(df) == 0)
  {
    return(character(0))
  }
  
  first <- sapply(1:nrow(df), function(i) getDefault(df, "firstName", i))
  last <- sapply(1:nrow(df), function(i) getDefault(df, "lastName", i))
  
  paste(first, last)
}

getPlayerRow <- function(df, playerId, playerName)
{
  if(is.null(df) || nrow(df) == 0)
  {
    return(NULL)
  }
  
  if("playerId" %in% names(df) && !is.null(playerId) && !is.na(playerId))
  {
    matchIndex <- which(df$playerId == playerId)
    
    if(length(matchIndex) > 0)
    {
      return(df[matchIndex[1], , drop = FALSE])
    }
  }
  
  namesVec <- playerNamesFromDF(df)
  matchIndex <- which(namesVec == playerName)
  
  if(length(matchIndex) > 0)
  {
    return(df[matchIndex[1], , drop = FALSE])
  }
  
  return(NULL)
}

# ============================================================
# Prediction Functions
# ============================================================

calculateDSIFromGoalies <- function(goalies)
{
  if(is.null(goalies) || nrow(goalies) == 0)
  {
    return(NA)
  }
  
  gp <- sum(goalies$gamesPlayed, na.rm = TRUE)
  ga <- sum(goalies$goalsAgainst, na.rm = TRUE)
  sa <- sum(goalies$shotsAgainst, na.rm = TRUE)
  
  if(is.na(gp) || gp == 0)
  {
    return(NA)
  }
  
  gaa <- ga / gp
  sapg <- sa / gp
  dsi <- (gaa + (sapg / 100)) / 2
  
  return(dsi)
}

normalizeDSI <- function(dsi, minDSI, maxDSI)
{
  if(is.na(dsi) || is.na(minDSI) || is.na(maxDSI) || maxDSI == minDSI)
  {
    return(0.5)
  }
  
  normalDSI_original <- (dsi - minDSI) / (maxDSI - minDSI)
  normalDSI_original <- 0.01 + (normalDSI_original * 0.98)
  
  if(normalDSI_original > 0.85)
  {
    normalDSI <- min(normalDSI_original, 0.80)
  }
  else if(normalDSI_original < 0.15)
  {
    normalDSI <- max(normalDSI_original, 0.20)
  }
  else
  {
    normalDSI <- normalDSI_original
  }
  
  return(normalDSI)
}

normalFromTeamData <- function(teamData, minDSI, maxDSI)
{
  dsi <- calculateDSIFromGoalies(teamData$goalies)
  normalizeDSI(dsi, minDSI, maxDSI)
}

normalWithGoalieFromTeamData <- function(teamData, minDSI, maxDSI, goalieName)
{
  if(is.null(goalieName) || goalieName == "None")
  {
    return(normalFromTeamData(teamData, minDSI, maxDSI))
  }
  
  goalies <- teamData$goalies
  
  if(is.null(goalies) || nrow(goalies) == 0)
  {
    return(normalFromTeamData(teamData, minDSI, maxDSI))
  }
  
  goalieNames <- playerNamesFromDF(goalies)
  goalieIndex <- which(goalieNames == goalieName)
  
  if(length(goalieIndex) == 0)
  {
    return(normalFromTeamData(teamData, minDSI, maxDSI))
  }
  
  oneGoalie <- goalies[goalieIndex[1], , drop = FALSE]
  dsi <- calculateDSIFromGoalies(oneGoalie)
  
  normalizeDSI(dsi, minDSI, maxDSI)
}

setUp <- function()
{
  thisYearWeight <- 0.7
  lastYearWeight <- 1 - thisYearWeight
  playersExpectedGoalsMin <- 0.35
  goalValue <- 0.6
  
  teamsData <- getAPI("https://api.nhle.com/stats/rest/en/team")$data
  lastYear <- getAPI("https://api.nhle.com/stats/rest/en/skater/summary?limit=-1&start=17&sort=points&cayenneExp=seasonId=20242025")
  inj <- getAPI("https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/injuries")
  
  maxDSI <- 0
  minDSI <- 100
  
  for(x in 1:nrow(teamsData))
  {
    if(((teamsData$id[x] < 31) && (teamsData$id[x] != 11) && (teamsData$id[x] != 27)) || 
       (teamsData$id[x] == 52) || 
       (teamsData$id[x] == 54) || 
       (teamsData$id[x] == 55) || 
       (teamsData$id[x] == 59))
    {
      teamABV <- teamsData$triCode[x]
      team <- getAPI(paste0("https://api-web.nhle.com/v1/club-stats/", teamABV, "/20252026/2"))
      
      dsi <- calculateDSIFromGoalies(team$goalies)
      
      if(!is.na(dsi))
      {
        if(dsi > maxDSI)
        {
          maxDSI <- dsi
        }
        if(dsi < minDSI)
        {
          minDSI <- dsi
        }
      }
    }
  }
  
  return(list(
    thisYearWeight = thisYearWeight,
    lastYearWeight = lastYearWeight,
    playersExpectedGoalsMin = playersExpectedGoalsMin,
    goalValue = goalValue,
    teams = teamsData,
    lastYear = lastYear,
    inj = inj,
    minDSI = minDSI,
    maxDSI = maxDSI
  ))
}

isInjuredPlayer <- function(skaters, p, inj)
{
  if(is.null(inj$injuries))
  {
    return(FALSE)
  }
  
  skaterLast <- getDefault(skaters, "lastName", p)
  
  for(t in 1:nrow(inj$injuries))
  {
    injuryTable <- inj$injuries$injuries[[t]]
    
    if(is.null(injuryTable) || nrow(injuryTable) == 0)
    {
      next
    }
    
    for(i in 1:nrow(injuryTable))
    {
      injuredLast <- injuryTable$athlete$lastName[i]
      
      if(length(injuredLast) > 0 &&
         length(skaterLast) > 0 &&
         !is.na(injuredLast) &&
         !is.na(skaterLast) &&
         injuredLast == skaterLast)
      {
        return(TRUE)
      }
    }
  }
  
  return(FALSE)
}

calculateSkaterResults <- function(teamObj, opponentDSI, setup)
{
  skaters <- teamObj$data$skaters
  teamABV <- teamObj$name
  
  thisYearWeight <- setup$thisYearWeight
  lastYearWeight <- setup$lastYearWeight
  playersExpectedGoalsMin <- setup$playersExpectedGoalsMin
  goalValue <- setup$goalValue
  lastYear <- setup$lastYear
  inj <- setup$inj
  
  allPoints <- list()
  expectedPoints <- list()
  ml <- data.frame()
  xG <- 0
  
  if(is.null(skaters) || nrow(skaters) == 0)
  {
    return(list(
      xG = 0,
      allPoints = allPoints,
      expectedPoints = expectedPoints,
      ml = ml
    ))
  }
  
  for(p in 1:nrow(skaters))
  {
    injured <- isInjuredPlayer(skaters, p, inj)
    
    if(injured == FALSE)
    {
      pxG <- 0
      toi <- 0
      
      playerID <- skaters$playerId[p]
      
      for(z in 1:nrow(lastYear$data))
      {
        if(playerID == lastYear$data$playerId[z])
        {
          toi <- (((skaters$avgTimeOnIcePerGame[p] * thisYearWeight) + 
                     (lastYear$data$timeOnIcePerGame[z] * lastYearWeight)) / 
                    ((60 * thisYearWeight) + (60 * lastYearWeight)))
          
          pxG <- round(
            (
              (
                ((skaters$goals[p] * thisYearWeight) + (lastYear$data$goals[z] * lastYearWeight)) / 
                  ((skaters$gamesPlayed[p] * thisYearWeight) + (lastYear$data$gamesPlayed[z] * lastYearWeight))
              ) *
                (
                  ((skaters$shots[p] * thisYearWeight) + (lastYear$data$shots[z] * lastYearWeight)) / 
                    ((skaters$gamesPlayed[p] * thisYearWeight) + (lastYear$data$gamesPlayed[z] * lastYearWeight))
                ) *
                (1 - opponentDSI) * 
                (toi / 60)
            ), 
            5
          )
        }
      }
      
      if(pxG == 0 && skaters$gamesPlayed[p] > 0)
      {
        toi <- (skaters$avgTimeOnIcePerGame[p] / 60)
        
        pxG <- round(
          ((skaters$goals[p] / skaters$gamesPlayed[p]) * 
             (skaters$shots[p] / skaters$gamesPlayed[p]) * 
             (1 - opponentDSI) * 
             (toi / 60)), 
          5
        )
      }
      
      playerName <- paste0(getDefault(skaters, "firstName", p), " ", getDefault(skaters, "lastName", p))
      playerPoints <- pxG / playersExpectedGoalsMin
      playerProbability <- round((1 - exp(-pxG)) * 100, 2)
      
      allPoints[[playerName]] <- c(round(playerPoints, 4), paste0(playerProbability, "%"))
      
      if(pxG >= playersExpectedGoalsMin)
      {
        expectedPoints[[playerName]] <- c(round(playerPoints, 4), paste0(playerProbability, "%"))
      }
      
      row <- data.frame(
        PlayerID = playerID, 
        TeamABV = teamABV, 
        Date = format(Sys.Date(), "%Y-%m-%d"), 
        Goals = skaters$goals[p], 
        GamesPlayed = skaters$gamesPlayed[p], 
        Shots = skaters$shots[p], 
        OpponentDSI = opponentDSI, 
        TOI = toi, 
        ExpectedPoints = pxG, 
        AtLeastOnePoint = ifelse(pxG >= playersExpectedGoalsMin, 1, 0)
      )
      
      ml <- rbind(ml, row)
      xG <- xG + pxG
    }
  }
  
  return(list(
    xG = xG,
    allPoints = allPoints,
    expectedPoints = expectedPoints,
    ml = ml
  ))
}

gameFromTeamObjects <- function(homeObj, awayObj, home_goalie, away_goalie, setup)
{
  awayDSI <- normalWithGoalieFromTeamData(
    awayObj$data,
    setup$minDSI,
    setup$maxDSI,
    away_goalie
  )
  
  homeResults <- calculateSkaterResults(
    teamObj = homeObj,
    opponentDSI = awayDSI,
    setup = setup
  )
  
  homeDSI <- normalWithGoalieFromTeamData(
    homeObj$data,
    setup$minDSI,
    setup$maxDSI,
    home_goalie
  )
  
  awayResults <- calculateSkaterResults(
    teamObj = awayObj,
    opponentDSI = homeDSI,
    setup = setup
  )
  
  homeXG <- homeResults$xG
  awayXG <- awayResults$xG
  
  homeWinProb <- round((1 / (1 + exp(-(homeXG - awayXG)))) * 100, 2)
  awayWinProb <- round(100 - homeWinProb, 2)
  
  if(homeXG > awayXG)
  {
    predictedWinner <- homeObj$name
  }
  else
  {
    predictedWinner <- awayObj$name
  }
  
  return(list(
    predictedWinner = predictedWinner,
    homeTeam = homeObj$name,
    awayTeam = awayObj$name,
    homeXG = homeXG,
    awayXG = awayXG,
    homeWinProb = homeWinProb,
    awayWinProb = awayWinProb,
    allHomePoints = homeResults$allPoints,
    allAwayPoints = awayResults$allPoints,
    homeExpectedPoints = homeResults$expectedPoints,
    awayExpectedPoints = awayResults$expectedPoints
  ))
}

# ============================================================
# Custom Roster Helpers
# ============================================================

teams <- c(
  "ANA", "BOS", "BUF", "CGY", "CAR", "CHI", "COL", "CBJ",
  "DAL", "DET", "EDM", "FLA", "LAK", "MIN", "MTL", "NSH",
  "NJD", "NYI", "NYR", "OTT", "PHI", "PIT", "SJS", "SEA",
  "STL", "TBL", "TOR", "UTA", "VAN", "VGK", "WSH", "WPG"
)

nhlTeams <- teams

jerseySlot <- function(id, positionLabel)
{
  actionButton(
    inputId = id,
    label = div(
      div(class = "slot-position", positionLabel),
      uiOutput(paste0(id, "_name"))
    ),
    class = "jersey-slot"
  )
}

rosterPlayerTable <- function(teamABV, position)
{
  team <- getAPI(paste0("https://api-web.nhle.com/v1/club-stats/", teamABV, "/20252026/2"))
  
  if(position == "goalie")
  {
    teamPos <- team$goalies
  }
  else if(position == "defense")
  {
    teamPos <- dplyr::filter(team$skaters, positionCode == "D")
  }
  else if(position == "forward")
  {
    teamPos <- dplyr::filter(team$skaters, positionCode != "D")
  }
  else
  {
    return(data.frame())
  }
  
  if(is.null(teamPos) || nrow(teamPos) == 0)
  {
    return(data.frame())
  }
  
  playerNames <- playerNamesFromDF(teamPos)
  
  data.frame(
    playerName = playerNames,
    playerId = teamPos$playerId,
    teamABV = teamABV,
    position = position,
    stringsAsFactors = FALSE
  )
}

rosterToList <- function(teamABV, position)
{
  playerTable <- rosterPlayerTable(teamABV, position)
  
  if(nrow(playerTable) == 0)
  {
    return(character(0))
  }
  
  return(playerTable$playerName)
}

buildCustomTeamData <- function(customRoster)
{
  skaterRows <- list()
  goalieRows <- list()
  
  for(slotName in names(customRoster$players))
  {
    playerInfo <- customRoster$players[[slotName]]
    
    if(is.null(playerInfo))
    {
      next
    }
    
    sourceTeam <- getAPI(paste0("https://api-web.nhle.com/v1/club-stats/", playerInfo$teamABV, "/20252026/2"))
    
    if(playerInfo$position == "goalie")
    {
      row <- getPlayerRow(sourceTeam$goalies, playerInfo$playerId, playerInfo$playerName)
      
      if(!is.null(row))
      {
        row$customSlot <- slotName
        row$sourceTeamABV <- playerInfo$teamABV
        goalieRows[[length(goalieRows) + 1]] <- row
      }
    }
    else
    {
      row <- getPlayerRow(sourceTeam$skaters, playerInfo$playerId, playerInfo$playerName)
      
      if(!is.null(row))
      {
        row$customSlot <- slotName
        row$sourceTeamABV <- playerInfo$teamABV
        skaterRows[[length(skaterRows) + 1]] <- row
      }
    }
  }
  
  skaters <- dplyr::bind_rows(skaterRows)
  goalies <- dplyr::bind_rows(goalieRows)
  
  return(list(
    skaters = skaters,
    goalies = goalies
  ))
}

getTeamObject <- function(teamName, customRosterList)
{
  if(teamName %in% names(customRosterList))
  {
    customData <- buildCustomTeamData(customRosterList[[teamName]])
    
    return(list(
      name = teamName,
      isCustom = TRUE,
      data = customData
    ))
  }
  
  teamData <- getAPI(paste0("https://api-web.nhle.com/v1/club-stats/", teamName, "/20252026/2"))
  
  return(list(
    name = teamName,
    isCustom = FALSE,
    data = teamData
  ))
}

playGame <- function(home_team, away_team, home_goalie, away_goalie, customRosterList = list())
{
  homeObj <- getTeamObject(home_team, customRosterList)
  awayObj <- getTeamObject(away_team, customRosterList)
  
  setup <- setUp()
  
  result <- gameFromTeamObjects(
    homeObj = homeObj,
    awayObj = awayObj,
    home_goalie = home_goalie,
    away_goalie = away_goalie,
    setup = setup
  )
  
  return(result)
}

# ============================================================
# UI
# ============================================================

ui <- fluidPage(
  
  tags$head(
    tags$style(HTML("
      .roster-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        margin-top: 20px;
      }

      .defense-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 31.5%));
        justify-content: center;
        gap: 20px;
        margin-top: 20px;
      }

      .goalie-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 31.5%));
        justify-content: center;
        gap: 20px;
        margin-top: 25px;
      }

      .jersey-slot {
        position: relative;
        background-color: #e0e0e0;
        border: 2px dashed #999;
        border-radius: 18px 18px 10px 10px;
        min-height: 150px;
        width: 100%;
        white-space: normal;  
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-weight: bold;
        text-align: center;
        transition: 0.2s;
        clip-path: polygon(
          18% 0%,
          82% 0%,
          100% 22%,
          88% 40%,
          88% 100%,
          12% 100%,
          12% 40%,
          0% 22%
        );
      }
      
      .jersey-slot::before {
        content: '';
        position: absolute;
        top: 0px;
        left: 50%;
        transform: translateX(-50%);
        width: 42px;
        height: 22px;
        background-color: white;
        border-radius: 0 0 22px 22px;
        border-left: 2px dashed #999;
        border-right: 2px dashed #999;
        border-bottom: 2px dashed #999;
        z-index: 1;
      }
      
      .jersey-slot .slot-position,
      .jersey-slot .slot-player {
        position: relative;
        z-index: 2;
      }

      .jersey-slot:hover {
        background-color: #cfcfcf;
        border-color: #555;
      }

      .slot-position {
        font-size: 14px;
        color: #555;
      }

      .slot-player {
        font-size: 18px;
        color: #111;
        margin-top: 8px;
      }
    "))
  ),
  
  titlePanel("NHL Game Simulator"),
  
  sidebarLayout(
    sidebarPanel(
      selectInput("home_team", "Choose Home Team:", choices = teams, selected = "FLA"),
      selectInput("away_team", "Choose Away Team:", choices = teams, selected = "EDM"),
      
      selectInput("home_goalie", "Optional Home Goalie:", choices = "None"),
      selectInput("away_goalie", "Optional Away Goalie:", choices = "None"),
      
      actionButton("run", "Run Simulation"),
      
      br(),
      br(),
      
      actionButton("create_custom_roster_btn", "Create Custom Roster")
    ),
    
    mainPanel(
      verbatimTextOutput("selected"),
      
      h3("Game Prediction"),
      verbatimTextOutput("game_prediction"),
      
      h3("Expected Point Scorers"),
      verbatimTextOutput("expected_scorers"),
      
      h3("All Home Player Point Values"),
      tableOutput("home_points"),
      
      h3("All Away Player Point Values"),
      tableOutput("away_points")
    )
  )
)

# ============================================================
# Server
# ============================================================

server <- function(input, output, session) {
  
  customPlayers <- reactiveValues()
  customRosterNames <- reactiveValues(Builder = "")
  customRosters <- reactiveValues()
  
  allRosterSlots <- function(side) {
    c(
      paste0(side, "_F", 1:12),
      paste0(side, "_D", 1:6),
      paste0(side, "_G", 1:2)
    )
  }
  
  getCustomRoster <- function(side) {
    slotIds <- allRosterSlots(side)
    
    players <- lapply(slotIds, function(slotId) {
      customPlayers[[slotId]]
    })
    
    names(players) <- slotIds
    
    list(
      teamName = customRosterNames[[side]],
      players = players
    )
  }
  
  allRosterFilled <- function(side) {
    slotIds <- allRosterSlots(side)
    
    all(sapply(slotIds, function(slotId) {
      playerInfo <- customPlayers[[slotId]]
      !is.null(playerInfo) &&
        !is.null(playerInfo$playerName) &&
        playerInfo$playerName != ""
    }))
  }
  
  selectedPlayersForSide <- function(side, exceptSlot = NULL) {
    slotIds <- allRosterSlots(side)
    
    if(!is.null(exceptSlot)) {
      slotIds <- setdiff(slotIds, exceptSlot)
    }
    
    selected <- sapply(slotIds, function(slotId) {
      playerInfo <- customPlayers[[slotId]]
      
      if(is.null(playerInfo) || is.null(playerInfo$playerName)) {
        NA
      } else {
        paste(playerInfo$teamABV, playerInfo$playerId, sep = "_")
      }
    })
    
    selected <- selected[!is.na(selected)]
    return(selected)
  }
  
  setSlotOutput <- function(slotId)
  {
    output[[paste0(slotId, "_name")]] <- renderUI({
      playerInfo <- customPlayers[[slotId]]
      
      if(is.null(playerInfo) || is.null(playerInfo$playerName) || playerInfo$playerName == "") {
        div(class = "slot-player", "Empty")
      } else {
        div(
          class = "slot-player",
          paste0(playerInfo$playerName, " (", playerInfo$teamABV, ")")
        )
      }
    })
  }
  
  openCreateTeamWindow <- function(side, warningMessage = NULL)
  {
    showModal(
      modalDialog(
        title = "Create a roster",
        
        if(!is.null(warningMessage))
        {
          div(
            style = "text-align: center; color: red; font-weight: bold; margin-bottom: 15px;",
            warningMessage
          )
        },
        
        div(
          style = "text-align: center; margin-bottom: 25px;",
          
          tags$label(
            "Custom Roster Name:",
            style = "font-weight: bold; display: block; margin-bottom: 8px;"
          ),
          
          tags$input(
            id = paste0(side, "_custom_team_name"),
            type = "text",
            value = customRosterNames[[side]],
            placeholder = "Example: Baltimore Bandits",
            class = "form-control",
            style = "width: 300px; margin: 0 auto; text-align: center;"
          )
        ),
        
        h4("Forwards", style = "text-align: center;"),
        div(
          class = "roster-grid",
          jerseySlot(paste0(side, "_F1"), "Forward 1"),
          jerseySlot(paste0(side, "_F2"), "Forward 2"),
          jerseySlot(paste0(side, "_F3"), "Forward 3"),
          jerseySlot(paste0(side, "_F4"), "Forward 4"),
          jerseySlot(paste0(side, "_F5"), "Forward 5"),
          jerseySlot(paste0(side, "_F6"), "Forward 6"),
          jerseySlot(paste0(side, "_F7"), "Forward 7"),
          jerseySlot(paste0(side, "_F8"), "Forward 8"),
          jerseySlot(paste0(side, "_F9"), "Forward 9"),
          jerseySlot(paste0(side, "_F10"), "Forward 10"),
          jerseySlot(paste0(side, "_F11"), "Forward 11"),
          jerseySlot(paste0(side, "_F12"), "Forward 12")
        ),
        
        h4("Defensemen", style = "text-align: center;"),
        div(
          class = "defense-grid",
          jerseySlot(paste0(side, "_D1"), "Defense 1"),
          jerseySlot(paste0(side, "_D2"), "Defense 2"),
          jerseySlot(paste0(side, "_D3"), "Defense 3"),
          jerseySlot(paste0(side, "_D4"), "Defense 4"),
          jerseySlot(paste0(side, "_D5"), "Defense 5"),
          jerseySlot(paste0(side, "_D6"), "Defense 6")
        ),
        
        h4("Goalies", style = "text-align: center;"),
        div(
          class = "goalie-grid",
          jerseySlot(paste0(side, "_G1"), "Goalie 1"),
          jerseySlot(paste0(side, "_G2"), "Goalie 2")
        ),
        
        footer = tagList(
          modalButton("Cancel"),
          actionButton(paste0("save_", side, "_custom_team"), "Save Team")
        ),
        
        size = "l",
        easyClose = TRUE
      )
    )
  }
  
  openPlayerSelector <- function(slotId, positionLabel)
  {
    position <- tolower(strsplit(positionLabel, " ")[[1]][1])
    side <- strsplit(slotId, "_")[[1]][1]
    
    nameInputId <- paste0(side, "_custom_team_name")
    
    if(!is.null(input[[nameInputId]])) {
      customRosterNames[[side]] <- input[[nameInputId]]
    }
    
    playerTable <- rosterPlayerTable("NYI", position)
    
    alreadySelected <- selectedPlayersForSide(
      side = side,
      exceptSlot = slotId
    )
    
    if(nrow(playerTable) > 0)
    {
      playerTable$key <- paste(playerTable$teamABV, playerTable$playerId, sep = "_")
      playerTable <- playerTable[!(playerTable$key %in% alreadySelected), ]
    }
    
    playerChoices <- playerTable$playerName
    
    if(length(playerChoices) == 0) {
      playerChoices <- "No available players"
    }
    
    customPlayers$currentSlot <- slotId
    customPlayers$currentSide <- side
    customPlayers$currentPosition <- position
    
    showModal(
      modalDialog(
        title = paste("Select Player for", positionLabel),
        
        div(
          style = "text-align: center;",
          
          selectInput(
            inputId = "temp_team_choice",
            label = "Choose Team:",
            choices = nhlTeams,
            selected = "NYI"
          ),
          
          selectInput(
            inputId = "temp_player_choice",
            label = "Choose Player:",
            choices = playerChoices,
            selected = playerChoices[1]
          )
        ),
        
        footer = tagList(
          modalButton("Cancel"),
          actionButton("confirm_player_choice", "Add Player")
        ),
        
        easyClose = TRUE
      )
    )
  }
  
  observeEvent(input$temp_team_choice, {
    
    req(input$temp_team_choice)
    req(customPlayers$currentPosition)
    req(customPlayers$currentSide)
    req(customPlayers$currentSlot)
    
    playerTable <- rosterPlayerTable(
      teamABV = input$temp_team_choice,
      position = customPlayers$currentPosition
    )
    
    alreadySelected <- selectedPlayersForSide(
      side = customPlayers$currentSide,
      exceptSlot = customPlayers$currentSlot
    )
    
    if(nrow(playerTable) > 0)
    {
      playerTable$key <- paste(playerTable$teamABV, playerTable$playerId, sep = "_")
      playerTable <- playerTable[!(playerTable$key %in% alreadySelected), ]
    }
    
    playerChoices <- playerTable$playerName
    
    if(length(playerChoices) == 0) {
      playerChoices <- "No available players"
    }
    
    updateSelectInput(
      session,
      "temp_player_choice",
      choices = playerChoices,
      selected = playerChoices[1]
    )
  })
  
  observeEvent(input$create_custom_roster_btn, {
    openCreateTeamWindow("Builder")
  })
  
  observeEvent(input$home_team, {
    
    req(input$home_team)
    
    customRosterList <- reactiveValuesToList(customRosters)
    
    if(input$home_team %in% names(customRosterList)) {
      
      selectedRoster <- customRosterList[[input$home_team]]
      
      customGoalies <- c(
        selectedRoster$players[["Builder_G1"]]$playerName,
        selectedRoster$players[["Builder_G2"]]$playerName
      )
      
      updateSelectInput(
        session,
        "home_goalie",
        choices = c("None", customGoalies),
        selected = "None"
      )
      
      return()
    }
    
    homeTeam <- getAPI(paste0("https://api-web.nhle.com/v1/club-stats/", input$home_team, "/20252026/2"))$goalies
    homeGoalies <- playerNamesFromDF(homeTeam)
    updateSelectInput(session, "home_goalie", choices = c("None", homeGoalies), selected = "None")
  })
  
  observeEvent(input$away_team, {
    
    req(input$away_team)
    
    customRosterList <- reactiveValuesToList(customRosters)
    
    if(input$away_team %in% names(customRosterList)) {
      
      selectedRoster <- customRosterList[[input$away_team]]
      
      customGoalies <- c(
        selectedRoster$players[["Builder_G1"]]$playerName,
        selectedRoster$players[["Builder_G2"]]$playerName
      )
      
      updateSelectInput(
        session,
        "away_goalie",
        choices = c("None", customGoalies),
        selected = "None"
      )
      
      return()
    }
    
    awayTeam <- getAPI(paste0("https://api-web.nhle.com/v1/club-stats/", input$away_team, "/20252026/2"))$goalies
    awayGoalies <- playerNamesFromDF(awayTeam)
    updateSelectInput(session, "away_goalie", choices = c("None", awayGoalies), selected = "None")
  })
  
  observeEvent(input$confirm_player_choice, {
    
    slotId <- customPlayers$currentSlot
    side <- customPlayers$currentSide
    selectedPlayer <- input$temp_player_choice
    selectedTeam <- input$temp_team_choice
    position <- customPlayers$currentPosition
    
    if(is.null(selectedPlayer) || selectedPlayer == "No available players") {
      showModal(
        modalDialog(
          title = "No Player Selected",
          p("Please choose an available player."),
          easyClose = TRUE,
          footer = modalButton("Close")
        )
      )
      return()
    }
    
    playerTable <- rosterPlayerTable(selectedTeam, position)
    selectedRow <- playerTable[playerTable$playerName == selectedPlayer, , drop = FALSE]
    
    if(nrow(selectedRow) == 0)
    {
      showModal(
        modalDialog(
          title = "Player Error",
          p("Could not find this player in the selected roster."),
          easyClose = TRUE,
          footer = modalButton("Close")
        )
      )
      return()
    }
    
    playerInfo <- list(
      playerName = selectedRow$playerName[1],
      playerId = selectedRow$playerId[1],
      teamABV = selectedRow$teamABV[1],
      position = selectedRow$position[1]
    )
    
    alreadySelected <- selectedPlayersForSide(
      side = side,
      exceptSlot = slotId
    )
    
    playerKey <- paste(playerInfo$teamABV, playerInfo$playerId, sep = "_")
    
    if(playerKey %in% alreadySelected) {
      showModal(
        modalDialog(
          title = "Duplicate Player",
          p("That player is already on this custom roster. Please choose a different player."),
          easyClose = TRUE,
          footer = modalButton("Close")
        )
      )
      return()
    }
    
    customPlayers[[slotId]] <- playerInfo
    
    removeModal()
    
    if(!is.null(side)) {
      openCreateTeamWindow(side)
    }
  })
  
  observeEvent(input$save_Builder_custom_team, {
    
    if(!is.null(input$Builder_custom_team_name)) {
      customRosterNames$Builder <- input$Builder_custom_team_name
    }
    
    rosterName <- trimws(customRosterNames$Builder)
    
    if(rosterName == "") {
      openCreateTeamWindow(
        "Builder",
        warningMessage = "You must enter a custom roster name before saving."
      )
      return()
    }
    
    if(rosterName %in% nhlTeams) {
      openCreateTeamWindow(
        "Builder",
        warningMessage = "That name is already an NHL team abbreviation. Please choose a different name."
      )
      return()
    }
    
    if(!allRosterFilled("Builder")) {
      openCreateTeamWindow(
        "Builder",
        warningMessage = "You must fill every roster spot before saving."
      )
      return()
    }
    
    currentCustomRosters <- reactiveValuesToList(customRosters)
    
    if(rosterName %in% names(currentCustomRosters)) {
      openCreateTeamWindow(
        "Builder",
        warningMessage = "That roster name already exists. Please choose a different name."
      )
      return()
    }
    
    customRosters[[rosterName]] <- getCustomRoster("Builder")
    
    newChoices <- c(nhlTeams, names(reactiveValuesToList(customRosters)))
    
    updateSelectInput(session, "home_team", choices = newChoices, selected = input$home_team)
    updateSelectInput(session, "away_team", choices = newChoices, selected = input$away_team)
    
    removeModal()
    
    showModal(
      modalDialog(
        title = "Roster Saved",
        p(paste(rosterName, "has been added to the team list and can now be used in the simulation.")),
        easyClose = TRUE,
        footer = modalButton("Close")
      )
    )
  })
  
  for(i in 1:12) {
    local({
      ii <- i
      
      observeEvent(input[[paste0("Builder_F", ii)]], {
        openPlayerSelector(paste0("Builder_F", ii), paste("Forward", ii))
      })
    })
  }
  
  for(i in 1:6) {
    local({
      ii <- i
      
      observeEvent(input[[paste0("Builder_D", ii)]], {
        openPlayerSelector(paste0("Builder_D", ii), paste("Defense", ii))
      })
    })
  }
  
  for(i in 1:2) {
    local({
      ii <- i
      
      observeEvent(input[[paste0("Builder_G", ii)]], {
        openPlayerSelector(paste0("Builder_G", ii), paste("Goalie", ii))
      })
    })
  }
  
  for(slotId in allRosterSlots("Builder")) {
    setSlotOutput(slotId)
  }
  
  output$selected <- renderPrint({
    list(
      HomeTeam = input$home_team,
      AwayTeam = input$away_team,
      HomeGoalie = input$home_goalie,
      AwayGoalie = input$away_goalie
    )
  })
  
  observeEvent(input$run, {
    
    home_team <- input$home_team
    away_team <- input$away_team
    home_goalie <- input$home_goalie
    away_goalie <- input$away_goalie
    
    customRosterList <- reactiveValuesToList(customRosters)
    
    result <- playGame(
      home_team = home_team,
      away_team = away_team,
      home_goalie = home_goalie,
      away_goalie = away_goalie,
      customRosterList = customRosterList
    )
    
    output$game_prediction <- renderPrint({
      cat(
        "Predicted Winner:", result$predictedWinner,
        "\n\n",
        result$homeTeam, "Expected Goals:", round(result$homeXG, 4),
        "\n",
        result$awayTeam, "Expected Goals:", round(result$awayXG, 4),
        "\n\n",
        result$homeTeam, "Win Probability:", result$homeWinProb, "%",
        "\n",
        result$awayTeam, "Win Probability:", result$awayWinProb, "%"
      )
    })
    
    output$expected_scorers <- renderPrint({
      
      if(length(result$homeExpectedPoints) == 0) {
        cat(result$homeTeam, "does not have any players that are expected to have at least one point\n")
      } else {
        cat(result$homeTeam, "Expected Players with at least one point:\n", sep = " ")
        
        for(player in names(result$homeExpectedPoints)) {
          cat(
            player, ": ",
            result$homeExpectedPoints[[player]][1],
            " Expected points (",
            result$homeExpectedPoints[[player]][2],
            ")\n",
            sep = ""
          )
        }
      }
      
      cat("\n")
      
      if(length(result$awayExpectedPoints) == 0) {
        cat(result$awayTeam, "does not have any players that are expected to have at least one point\n")
      } else {
        cat(result$awayTeam, "Expected Players with at least one point:\n", sep = " ")
        
        for(player in names(result$awayExpectedPoints)) {
          cat(
            player, ": ",
            result$awayExpectedPoints[[player]][1],
            " Expected points (",
            result$awayExpectedPoints[[player]][2],
            ")\n",
            sep = ""
          )
        }
      }
    })
    
    output$home_points <- renderTable({
      if(length(result$allHomePoints) == 0) {
        return(data.frame(Player = character(), XP = numeric(), Probability = character()))
      }
      
      data.frame(
        Player = names(result$allHomePoints),
        Expected_Points = sapply(result$allHomePoints, function(x) x[1]),
        Probability = sapply(result$allHomePoints, function(x) x[2]),
        row.names = NULL
      )
    })
    
    output$away_points <- renderTable({
      if(length(result$allAwayPoints) == 0) {
        return(data.frame(Player = character(), XP = numeric(), Probability = character()))
      }
      
      data.frame(
        Player = names(result$allAwayPoints),
        Expected_Points = sapply(result$allAwayPoints, function(x) x[1]),
        Probability = sapply(result$allAwayPoints, function(x) x[2]),
        row.names = NULL
      )
    })
  })
}

shinyApp(ui, server)