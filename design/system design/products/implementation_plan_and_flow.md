

### Add product 

## Needed fields :

* product info: name,  barcode, qr code, descirtion, shortDescirption, .....
* attributes, quantity
* select warehouse to store the products




##  Product adding flow

# Step 1 — Product Basic Info Section:
include the basic info like name, description, category, brand etc. 



# Attribute Selection Section

get the existing attribute from backend and select or create new attribute. 


# Others 
input others data like warehouse etc.





## sending data structure from frontend to backend : 





## backend product data saving flow :

# create parent and child product 
  * generate product-creation suitable data from the api data to create product
  * create parent and child product in database using the generated data
  * create stockBatch for every child product
  * every stoackBatch will have stockLocation table data that will hold the warehouse related information of this product






  ### APIS


  ## Create

  ## Get

  ## Get single product

  need to send data :
  - product id
  - get product info of product table like name, description, brand, category etc.
  - price: 


  ## update


  ## Delete

