enum Symbol
{
  NONE,
  X,
  O;
}

class box
{
  int x1, x2, y1, y2;
  
  Symbol player;
  box(int x1, int y1, int x2, int y2)
  {
    this.x1 = x1;
    this.x2 = x2;
    this.y1 = y1;
    this.y2 = y2;
    
    rect(x1, y1, x2, y2);
    player = Symbol.NONE;
  }
  
  void clickX()
  {
    if(player==Symbol.NONE)
    {
      player = Symbol.X;
      this.showPlayer();
      println("X");
    }
    isAI = true;
  }
  
  void clickO()
  {
    if(player==Symbol.NONE)
    {
      player = Symbol.O;
      this.showPlayer();
      println("O");
    }
    isAI = true;
  }
  
  void showPlayer()
  {
    String sym = "";
    if(player==Symbol.X)
    {
      sym = "X";
    }
    else if(player==Symbol.O)
    {
      sym = "O";
    }
    text(sym, (x1)+(boxSize/2)-58, (y1)+(boxSize/2)+55);
  }
  
  boolean contains(int x, int y)
  {
    if((x1<x && x<x1+x2) && (y1<y && y<y1+y2))
    {
      return true;
    }
    return false;
  }
}
