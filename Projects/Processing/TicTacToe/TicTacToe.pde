box[][] grid = new box[3][3];
int counter = 1;
int boxSize = 681/3;
boolean xWins = false;
boolean oWins = false;
boolean isAI = false;
ai Comp = new ai(Level.Hard);

void setup()
{
  size(681, 681);
  PFont f = createFont("Arial",16,true);
  textFont(f,150);
  
  for(int x=0; x<3; x++)
  {
    for(int y=0; y<3; y++)
    {
      grid[x][y] = new box(x*boxSize, y*boxSize, boxSize, boxSize);
    }
  }
}

void draw()
{
  for(int x=0; x<3; x++)
  {
    for(int y=0; y<3; y++)
    {
      fill(0, 0, 0);
    }
  }
  if(isAI==true&&xWins==false&&oWins==false)
  {
    Comp.move();
    checkWin(Symbol.X);
    checkWin(Symbol.O);
    isAI=false;
  }
  if(xWins)
  {
    print("X WINS!!!");
  }
  else if(oWins)
  {
    print("O WINS!!!");
  }
}

void mousePressed()
{
  if(xWins==false&&oWins==false&&isAI==false)
  {
    if(counter%2==0)
    {
      for(int x=0; x<3; x++)
      {
        for(int y=0; y<3; y++)
        {
          if(grid[x][y].contains(mouseX, mouseY) && grid[x][y].player==Symbol.NONE)
          {
            grid[x][y].clickX();
            
            counter++;
          }
        }
      }
    }
    else
    {
      for(int x=0; x<3; x++)
      {
        for(int y=0; y<3; y++)
        {
          if(grid[x][y].contains(mouseX, mouseY) && grid[x][y].player==Symbol.NONE)
          {
            grid[x][y].clickO();
            counter++;
          }
        }
      }
    }
    checkWin(Symbol.X);
    checkWin(Symbol.O);
  }
}

void keyPressed()
{
  if(key=='r')
  {
    reset();
  }
  if(key=='e' && Comp.diff!=Level.Easy)
  {
    Comp = new ai(Level.Easy);
    reset();
  }
  if(key=='h' && Comp.diff!=Level.Hard)
  {
    Comp = new ai(Level.Hard);
    reset();
  }
  println();println();println();println();println();println();println();println();println();
}

void checkWin(Symbol sym)
{
  if(grid[0][0].player==sym && grid[0][1].player==sym && grid[0][2].player==sym)
  {
    if(sym==Symbol.X)
    {
      xWins=true;
    }
    else
    {
      oWins=true;
    }
  }
  else if(grid[1][0].player==sym && grid[1][1].player==sym && grid[1][2].player==sym)
  {
    if(sym==Symbol.X)
    {
      xWins=true;
    }
    else
    {
      oWins=true;
    }
  }
  else if(grid[2][0].player==sym && grid[2][1].player==sym && grid[2][2].player==sym)
  {
    if(sym==Symbol.X)
    {
      xWins=true;
    }
    else
    {
      oWins=true;
    }
  }
  else if(grid[0][0].player==sym && grid[1][0].player==sym && grid[2][0].player==sym)
  {
    if(sym==Symbol.X)
    {
      xWins=true;
    }
    else
    {
      oWins=true;
    }
  }
  else if(grid[0][1].player==sym && grid[1][1].player==sym && grid[2][1].player==sym)
  {
    if(sym==Symbol.X)
    {
      xWins=true;
    }
    else
    {
      oWins=true;
    }
  }
  else if(grid[0][2].player==sym && grid[1][2].player==sym && grid[2][2].player==sym)
  {
    if(sym==Symbol.X)
    {
      xWins=true;
    }
    else
    {
      oWins=true;
    }
  }
  else if(grid[0][0].player==sym && grid[1][1].player==sym && grid[2][2].player==sym)
  {
    if(sym==Symbol.X)
    {
      xWins=true;
    }
    else
    {
      oWins=true;
    }
  }
  else if(grid[2][0].player==sym && grid[1][1].player==sym && grid[0][2].player==sym)
  {
    if(sym==Symbol.X)
    {
      xWins=true;
    }
    else
    {
      oWins=true;
    }
  }
}

void reset()
{
  for(int x=0; x<3; x++)
  {
    for(int y=0; y<3; y++)
    {
      fill(255,255,255);
      grid[x][y] = new box(x*boxSize, y*boxSize, boxSize, boxSize);
    }
  }
  xWins = false;
  oWins = false;
  Comp.giveX=-5;
  Comp.giveY=-5;
}
