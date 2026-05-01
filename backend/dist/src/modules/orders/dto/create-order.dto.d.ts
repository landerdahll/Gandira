export declare class OrderItemDto {
    batchId: string;
    quantity: number;
}
export declare class CreateOrderDto {
    eventId: string;
    items: OrderItemDto[];
}
