General:
I want a map editing pages in this version I do not have map editing but I will be able to have an image map already created and use it to make borders, points and names on it. A left top vertical floating element with border radius and shadow so it is distinct from the background of it. The map in the center of the screen.

The below modal section for each button describes the modal each button opens

The In map describes how the mouse interacts with this object is displayed in the map or when I select an object from the map.

When I opent eh sidebar the buttons will move to the right to fit 

Shared features:
On the bottom of the modals put a link to other objects button . This will opent he sidebar and show the same icon in the objects as the icon shown when I drag a note. In this way when I click one the modal object (point, line, text or border) is linked. In all the elements of the map when I click them show a forward link icon next to their name meaning see linked object, in the point element this forwarding will exist in the modal too.

Mouse
Modal
The only one without modal
In map
The regural mouse. Will have certain functionality according to the object it hovers or clicks. More info by object below.

Line
Regural lines someone can paint in the map for showing traces directions everything.
Modal
The modal of the lines will give functionalities for:
A name input first 
colour and opacity, opacity in a bar 

A list of the types shown in horizontal rectangle elements which are in a vertical listm the elements will show example part of the same line a little curved with each element on the types below
distinguished line (when choose this show a gap size bar and a parts size below it when the drop-down closes), continues line (default), two small parallel lines, diagonal distinguished (similar drop-down as the distinguished lines)
By default only the active type will be shown with a drop-down arrow on the right side of it which shows all the types 

Below it a section about arrow in the line on the left side of the section a checkbox that adds one arrow in the one edge of the line. Below it two half elements similar to the type elements. These will show the current line edges with arrows one left and one right with straight line. These will have one checkbox each (on the opposite side of the arrow). The checkbox will be about if the line will have arrow on this side. 
Below the two elements put a drop-down with grid squares showing styles of buttons and a bar for choosing side) 

Below a two column grid with these options in elements of the grid (rounded, exact mouse line, straight line, edge corners). Each one will show a sample of what it does in the line like the other elements. Exact mouse line is default. This selection is called the drawing way. The exact mouse line will have a bar below to choose the softness and the edge corners will have a corner degrees intensity.

same width as I zoom yes or not checkbox below 
thickness bar below 

Focusing button on the left side of the first row, the name row. Left of it a split icon which when I click it and click a line I will be able to split it in two. Show a modal with info next to this icon when I hover to know what it does. I am gonna use a lot this modal so make it reusable like code. Next to them and erasor button.
EDIT: one correction for the drop downs except the arrow dropdown. The other dropdowns will not be dropdowns. All there options will be simultaneously visible one below the other and in the parent not separate small modal. Just when one of them has a separate bar or button about it (like mouse shape has softness) then this will appear below the element only when it is selected.
In map
When I hover the line:
If i have selected the drawing way to be follow exactly mouse moving then just lighten the line to more visible and make the mouse hand to show intent of dragging. If the drawing way is other then show the points of it (rounded then these figma like vectors in points that change the curvature around them, if straight line only the edges, if cornery like only the corners these will have vectors too for the straight lines of the corner points). The vector things appear when I click in the points. Also when click the points I will be able to move them in order to change the line.
Clicking the line appears a drafted square distinguished lines border around the line, even if I rotate the line the square doesn't rotate just changes shape to adjust. This has top right arrows diagonal button for rotating and changing size custom ratio, bottom right a X remove line button, and top left a reverse horizontal button and a reverse vertical button next to it. Top right and of the diagonal arrow button will be: split icon, duplicate
Double click in the line splits in two.
Hovering the point where two touching lines connect will make then connect if I click it


Border
The user will be able to make countries and areas with this in the map
Modal 
Name, erasor and focursicon on first row like before.
Thickness bar
Three options, mouse like shape (this option shows a softness bar below), linear border, shape. One below the other all visible. The shape one will have a list of shapes in a grid of three columns and show shapes similar to Microsoft paint.

In map
While I am drawing it it will show the inner overlayed to show that it is becoming a bordered area. When I start drawing a border near the edge point of another border then these two will become one. 
When I hover the inner of enclosed borders and don't have area name will show a small modal input there for putting
When I click an area it will show the distinguished line square like the line with the exact same buttons except the flip and duplicate. Also when I draw border near existing border they will merge into one. When the two borders have different colour then show both colours touching. 
Hovering the inner or the border makes it lighten.
The area name will be on the center and will be just a text object. On an empty corner of the drafted square put an icon button for making a description below the name text.

Text
The normal text
Modal
Make a common text editor for this
It will have a drop-down to select if I want to connect with a border or point or line
In map
Exactly how I click text on figma.
When I create an object in the inner of a border with no name then by default make it area name and inform the user. If name already exists then regural text object

Points
The points are pins with info in the map
Modal 
The modal appears only when I click on an existing point not when I click the button.
The modal of this will be shown on visitors of the map not only the user so must have good UI.
The name of it in an input, an full width add banner image on the top and left of the name a pin icon with a bottom right edit pencil circle small icon indicating to change it. Also duplicate and focus icons on the right side. A tiptapeditor text below this. 
In map
Just the asset in the point. When a visitor clicks it will see the modal firstly in a small format like floating above the point, but this will have a show more button. The the whole write opens. 

Above I am refering to corner button of drafted square ahen I select and object. I want this to have on more icon for connecting the elements to sidebar objects exactly like the note button in the modal. In the border it will be top right of the top right corner button. In line it will be left bottom 

Multiple selection:
I will be able to drag and select many different items at once similar to figma. When I do it just show a modal with colour inputs one below the other for every colour in the selected elements.


Rest of the map:
Top right put a rounded element similar to the left buttons parent element but horizontal. This will have a create branch button which will duplicate the whole map and everything on it in a new branch . This button will be called map branches and will show the list of the existing branches. Also on the bottom of the list input for name and big create new branch button. Left of it a share button to share the whole map. Next of it a take screenshot button.
Top left similar styled input with the name of the map and a three dots button with oprtons that the map card element has too.

Carousel Map button with a list of maps and drag and drop feature for them. ways of showing them (carousel, appearing with opacity, like book pages)

The points will have label like organization (city, mountain, country, sea, river etc) 
