enum Level
{
  Human,
  Easy,
  Hard;
}

class ai
{
  int giveX=-5;
  int giveY=-5;
  Level diff;
  int checkX=5;
  int checkY=5;
  ai(Level level)
  {
    diff = level;
  }
  
  void move()
  {
    if(diff==Level.Easy)
    {
      easy();
    }
    else if(diff==Level.Hard)
    {
      int ran = (int)(random(1, 101));
      if(ran<95)
      {
        hard();
      }
      else
      {
        easy();
      }
    }
  }
  
  void easy()
  {
    //All random
    boolean moved = false;
    while(moved==false)
    {
      int ranX = (int)(random(0, 3));
      int ranY = (int)(random(0, 3));
      if(grid[ranX][ranY].player==Symbol.NONE)
      {
        moved = true;
        grid[ranX][ranY].clickX();
        counter++;
      }
    }
  }
  
  void hard()
  {
    //Win
    //Block
    //Set up
    //Random
    
    //Win
    if(checkNextWin(Symbol.X)==true)
    {
      //println("("+giveX+", "+giveY+")");
      grid[giveX][giveY].clickX();
      counter++;
    }
    else if(checkCornerNextWin(Symbol.X)==true)
    {
      grid[giveX][giveY].clickX();
      counter++;
    }
    
    //Block
    else if(checkNextWin(Symbol.O)==true)
    {
      //println("("+giveX+", "+giveY+")");
      grid[giveX][giveY].clickX();
      counter++;
    }
    else if(checkCornerNextWin(Symbol.O)==true)
    {
      grid[giveX][giveY].clickX();
      counter++;
    }
    
    //Random
    else
    {
      easy();
    }
    
    giveX=-5;
    giveY=-5;
  }
  
  void human()
  {
    
  }
  
   boolean checkNextWin(Symbol sym)
   {
     boolean check = false;
     
     if(grid[0][0].player==sym && grid[1][0].player==sym && grid[2][0].player==Symbol.NONE)
     {
       giveX=2;
       giveY=0;
       check=true;
     }
     else if(grid[1][0].player==sym && grid[2][0].player==sym && grid[0][0].player==Symbol.NONE)
     {
       giveX=0;
       giveY=0;
       check=true;
     }
     else if(grid[0][0].player==sym && grid[2][0].player==sym && grid[1][0].player==Symbol.NONE)
     {
       giveX=1;
       giveY=0;
       check=true;
     }
     
     else if(grid[0][1].player==sym && grid[1][1].player==sym && grid[2][1].player==Symbol.NONE)
     {
       giveX=2;
       giveY=1;
       check=true;
     }
     else if(grid[1][1].player==sym && grid[2][1].player==sym && grid[0][1].player==Symbol.NONE)
     {
       giveX=0;
       giveY=1;
       check=true;
     }
     else if(grid[0][1].player==sym && grid[2][1].player==sym && grid[1][1].player==Symbol.NONE)
     {
       giveX=1;
       giveY=1;
       check=true;
     }
     
     else if(grid[0][2].player==sym && grid[1][2].player==sym && grid[2][2].player==Symbol.NONE)
     {
       giveX=2;
       giveY=2;
       check=true;
     }
     else if(grid[1][2].player==sym && grid[2][2].player==sym && grid[0][2].player==Symbol.NONE)
     {
       giveX=0;
       giveY=2;
       check=true;
     }
     else if(grid[0][2].player==sym && grid[2][2].player==sym && grid[1][2].player==Symbol.NONE)
     {
       giveX=1;
       giveY=2;
       check=true;
     }
     
     if(grid[0][0].player==sym && grid[0][1].player==sym && grid[0][2].player==Symbol.NONE)
     {
       giveX=0;
       giveY=2;
       check=true;
     }
     else if(grid[0][1].player==sym && grid[0][2].player==sym && grid[0][0].player==Symbol.NONE)
     {
       giveX=0;
       giveY=0;
       check=true;
     }
     else if(grid[0][0].player==sym && grid[0][2].player==sym && grid[0][1].player==Symbol.NONE)
     {
       giveX=0;
       giveY=1;
       check=true;
     }
     
     else if(grid[1][0].player==sym && grid[1][1].player==sym && grid[1][2].player==Symbol.NONE)
     {
       giveX=1;
       giveY=2;
       check=true;
     }
     else if(grid[1][1].player==sym && grid[1][2].player==sym && grid[1][0].player==Symbol.NONE)
     {
       giveX=1;
       giveY=0;
       check=true;
     }
     else if(grid[1][0].player==sym && grid[1][2].player==sym && grid[1][1].player==Symbol.NONE)
     {
       giveX=1;
       giveY=1;
       check=true;
     }
     
     else if(grid[2][0].player==sym && grid[2][1].player==sym && grid[2][2].player==Symbol.NONE)
     {
       giveX=2;
       giveY=2;
       check=true;
     }
     else if(grid[2][1].player==sym && grid[2][2].player==sym && grid[2][0].player==Symbol.NONE)
     {
       giveX=2;
       giveY=0;
       check=true;
     }
     else if(grid[2][0].player==sym && grid[2][2].player==sym && grid[2][1].player==Symbol.NONE)
     {
       giveX=2;
       giveY=1;
       check=true;
     }
     return check;
   }
   
   boolean checkCornerNextWin(Symbol sym)
   {
     boolean check=false;
     
     if(grid[0][0].player==sym && grid[1][1].player==sym && grid[2][2].player==Symbol.NONE)
     {
       giveX=2;
       giveY=2;
       check=true;
     }
     else if(grid[0][0].player==sym && grid[2][2].player==sym && grid[1][1].player==Symbol.NONE)
     {
       giveX=1;
       giveY=1;
       check=true;
     }
     else if(grid[1][1].player==sym && grid[2][2].player==sym && grid[0][0].player==Symbol.NONE)
     {
       giveX=0;
       giveY=0;
       check=true;
     }
     
     else if(grid[0][2].player==sym && grid[1][1].player==sym && grid[2][0].player==Symbol.NONE)
     {
       giveX=2;
       giveY=0;
       check=true;
     }
     else if(grid[0][2].player==sym && grid[2][0].player==sym && grid[1][1].player==Symbol.NONE)
     {
       giveX=1;
       giveY=1;
       check=true;
     }
     else if(grid[1][1].player==sym && grid[2][0].player==sym && grid[0][2].player==Symbol.NONE)
     {
       giveX=0;
       giveY=2;
       check=true;
     }
     return check;
   }
}
