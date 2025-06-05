from django.db import models

# Create your models here.
class Inventory(models.Model):
    user = models.ForeignKey("users.Account", on_delete=models.CASCADE, null=True, blank=True)
    products = models.ManyToManyField("Product", related_name="products", blank=True)
    def __str__(self):
        return f"Inventario de {self.user.email if self.user else self.branch_office.name}"
    
    class Meta:
        verbose_name = "Inventory"
        verbose_name_plural = "Inventories"
        
class Product(models.Model):
    active = models.BooleanField(default=True)
    name = models.CharField(max_length=100)
    sell_price = models.FloatField(null=True, blank=True)
    sku = models.CharField(max_length=100, null=True, blank=True)
    providers = models.ManyToManyField("purchase.Provider", related_name="products", blank=True)
    # provider = models.ForeignKey("purchase.Provider", on_delete=models.CASCADE, null=True, blank=True)
    min_stock = models.FloatField(null=True, blank=True)
    max_stock = models.FloatField(null=True, blank=True)
    category = models.CharField(max_length=100, null=True, blank=True)
    unit_of_measure = models.CharField(max_length=20, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    date = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    product_image = models.ImageField(upload_to="products", null=True, blank=True)
    def __str__(self):
        return f"{self.name}"


class ProductVariants(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    price_unit = models.FloatField()
    sell_price = models.FloatField(null=True, blank=True)
    location = models.CharField(max_length=100, null=True, blank=True)
    expiration_date = models.DateField(null=True, blank=True)
    quantity = models.FloatField()
    sku = models.CharField(max_length=100, null=True, blank=True)
    def __str__(self):
        return f"{self.name} - {self.product.name}"
    
class Movement(models.Model):
    movements_types = (
        ("income", "Entrada"),
        ("outcome", "Salida")
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    product_variant = models.ForeignKey(ProductVariants, on_delete=models.CASCADE, null=True, blank=True)
    quantity = models.FloatField(null=True, blank=True)
    movement_type = models.CharField(max_length=100, choices=movements_types)
    date = models.DateTimeField(null=True, blank=True)
    operator = models.ForeignKey("users.Account", on_delete=models.CASCADE, null=True, blank=True)
    def __str__(self):
        return f"{self.product.name} - {self.quantity} - {self.movement_type}"
    
class ProductBatch(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.FloatField(null=True, blank=True)
    initial_quantity = models.FloatField(null=True, blank=True)  # Nueva cantidad inicial
    price_unit = models.FloatField(null=True, blank=True)
    sell_price = models.FloatField(null=True, blank=True)
    location = models.CharField(max_length=100, null=True, blank=True)
    batch = models.CharField(max_length=100)
    expiration_date = models.DateField(null=True, blank=True)
    updated = models.DateTimeField(auto_now=True)
    active = models.BooleanField(default=True)
    unit_of_measure = models.CharField(max_length=20, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    waste = models.FloatField(null=True, blank=True)
    safety_stock = models.FloatField(null=True, blank=True)
    purchase_order = models.ForeignKey("purchase.Order", on_delete=models.CASCADE, null=True, blank=True)
    sold_quantity = models.PositiveIntegerField(default=0)  # Nueva cantidad vendida

    is_consignment = models.BooleanField(default=False)
    consignment_order = models.ForeignKey(
        "purchase.Order", 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='consignment_batches'
    )
    def __str__(self):
        return f"{self.product.name} - {self.batch} - {self.expiration_date}"